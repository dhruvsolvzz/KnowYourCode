'use strict';
const User = require('../../shared/database/models/User.model');
const { hashTokenSHA256, hashRefreshToken, compareRefreshToken } = require('../../shared/utils/hashToken');
const { REFRESH_TOKEN_MAX_PER_USER } = require('../../shared/constants/limits');

class AuthRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.toString().trim().toLowerCase();
    return User.findOne({ email: normalizedEmail }).select('+password');
  }

  async findById(id) {
    return User.findById(id);
  }

  async findByGithubId(githubId) {
    return User.findOne({ githubId });
  }

  async findByVerificationToken(token) {
    const hashed = hashTokenSHA256(token);
    return User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    });
  }

  async findByResetToken(token) {
    const hashed = hashTokenSHA256(token);
    return User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    });
  }

  async setVerificationToken(userId, token, expires) {
    const hashed = hashTokenSHA256(token);
    return User.findByIdAndUpdate(userId, {
      emailVerificationToken: hashed,
      emailVerificationExpires: expires,
    });
  }

  async verifyEmail(userId) {
    return User.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });
  }

  async setResetToken(userId, token, expires) {
    const hashed = hashTokenSHA256(token);
    return User.findByIdAndUpdate(userId, {
      passwordResetToken: hashed,
      passwordResetExpires: expires,
    });
  }

  async resetPassword(userId, newPassword) {
    const user = await User.findById(userId);
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate all refresh tokens on password reset
    user.refreshTokens = [];
    await user.save();
    return user;
  }

  async addRefreshToken(userId, rawToken) {
    const hashed = await hashRefreshToken(rawToken);

    // Keep only last N tokens (cleanup old devices)
    const user = await User.findById(userId).select('+refreshTokens');
    if (user.refreshTokens.length >= REFRESH_TOKEN_MAX_PER_USER) {
      user.refreshTokens = user.refreshTokens.slice(-REFRESH_TOKEN_MAX_PER_USER + 1);
    }
    user.refreshTokens.push({ token: hashed, createdAt: new Date() });
    await user.save();
  }

  async findAndRotateRefreshToken(userId, rawToken) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return null;

    // Find matching hashed token
    let matchIndex = -1;
    for (let i = 0; i < user.refreshTokens.length; i++) {
      const match = await compareRefreshToken(rawToken, user.refreshTokens[i].token);
      if (match) { matchIndex = i; break; }
    }

    if (matchIndex === -1) return null;

    // Remove the used token (single-use rotation)
    user.refreshTokens.splice(matchIndex, 1);
    await user.save();
    return user;
  }

  async removeRefreshToken(userId, rawToken) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    const kept = [];
    for (const rt of user.refreshTokens) {
      const match = await compareRefreshToken(rawToken, rt.token);
      if (!match) kept.push(rt);
    }
    user.refreshTokens = kept;
    await user.save();
  }

  async linkGithubAccount(userId, githubData) {
    return User.findByIdAndUpdate(userId, githubData, { new: true });
  }

  async updateGithubToken(userId, accessToken) {
    return User.findByIdAndUpdate(userId, { githubAccessToken: accessToken }, { new: true });
  }

  async findByGoogleId(googleId) {
    return User.findOne({ googleId });
  }

  async linkGoogleAccount(userId, googleData) {
    return User.findByIdAndUpdate(userId, googleData, { new: true });
  }

  async updateGoogleToken(userId, accessToken) {
    return User.findByIdAndUpdate(userId, { googleAccessToken: accessToken }, { new: true });
  }

  async addAccessToken(userId, token) {
    const user = await User.findById(userId).select('+accessTokens');
    if (!user) return;
    if (!user.accessTokens) user.accessTokens = [];
    if (user.accessTokens.length >= 10) {
      user.accessTokens = user.accessTokens.slice(-9);
    }
    user.accessTokens.push(token);
    await user.save();
  }

  async removeAccessToken(userId, token) {
    return User.findByIdAndUpdate(userId, {
      $pull: { accessTokens: token }
    });
  }
}

module.exports = new AuthRepository();
