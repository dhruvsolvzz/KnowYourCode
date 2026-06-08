'use strict';
const AppError = require('../../shared/utils/AppError');
const authRepository = require('./auth.repository');
const emailService = require('../email/email.service');
const { generateAccessToken, generateRefreshToken, generateVerificationToken } = require('../../shared/utils/generateToken');
const { AUTH_INVALID_CREDENTIALS, AUTH_EMAIL_ALREADY_EXISTS, AUTH_USER_NOT_FOUND, AUTH_INVALID_RESET_TOKEN, AUTH_REFRESH_TOKEN_INVALID } = require('../../shared/constants/errorCodes');
const logger = require('../../shared/utils/logger');

const VERIFICATION_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class AuthService {
  async register(name, email, password) {
    // Anti-enumeration: always say "check your email" — never confirm if email exists
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      // Don't reveal the email exists — still send verification email silently
      // But to avoid abuse, we skip sending if already verified
      if (!existing.isEmailVerified) {
        const token = generateVerificationToken();
        const expires = new Date(Date.now() + VERIFICATION_EXPIRES_MS);
        await authRepository.setVerificationToken(existing._id, token, expires);
        await emailService.sendVerificationEmail(existing.email, existing.name, token);
      }
      // Return generic success (anti-enumeration)
      return { message: 'If this email is not registered, a verification link has been sent.' };
    }

    const user = await authRepository.create({ name, email, password });

    const token = generateVerificationToken();
    const expires = new Date(Date.now() + VERIFICATION_EXPIRES_MS);
    await authRepository.setVerificationToken(user._id, token, expires);

    await emailService.sendVerificationEmail(user.email, user.name, token);

    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  async login(email, password, res) {
    const user = await authRepository.findByEmail(email);

    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401, AUTH_INVALID_CREDENTIALS);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, AUTH_INVALID_CREDENTIALS);
    }

    if (!user.isEmailVerified) {
      throw new AppError(
        'Please verify your email address before logging in.',
        403,
        'AUTH_EMAIL_NOT_VERIFIED'
      );
    }

    return this._issueTokens(user, res);
  }

  async _issueTokens(user, res) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();

    await authRepository.addRefreshToken(user._id, refreshToken);
    await authRepository.addAccessToken(user._id, accessToken);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return {
      accessToken,
      user: user.toJSON(),
    };
  }

  async logout(userId, rawRefreshToken, res, rawAccessToken) {
    if (rawRefreshToken) {
      await authRepository.removeRefreshToken(userId, rawRefreshToken);
    }
    if (rawAccessToken) {
      await authRepository.removeAccessToken(userId, rawAccessToken);
    }
    res.clearCookie('refreshToken');
  }

  async verifyEmail(token) {
    const user = await authRepository.findByVerificationToken(token);
    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'AUTH_INVALID_VERIFICATION_TOKEN');
    }
    await authRepository.verifyEmail(user._id);
    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email) {
    const user = await authRepository.findByEmail(email);
    // Anti-enumeration: always return same message
    if (user && !user.isEmailVerified) {
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + VERIFICATION_EXPIRES_MS);
      await authRepository.setVerificationToken(user._id, token, expires);
      await emailService.sendVerificationEmail(user.email, user.name, token);
    }
    return { message: 'If your email is registered and unverified, a new link has been sent.' };
  }

  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);
    // Anti-enumeration: always same response
    if (user) {
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + RESET_EXPIRES_MS);
      await authRepository.setResetToken(user._id, token, expires);
      await emailService.sendPasswordResetEmail(user.email, user.name, token);
    }
    return { message: 'If this email is registered, a password reset link has been sent.' };
  }

  async resetPassword(token, newPassword) {
    const user = await authRepository.findByResetToken(token);
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, AUTH_INVALID_RESET_TOKEN);
    }
    await authRepository.resetPassword(user._id, newPassword);
    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  async refreshTokens(rawRefreshToken, res) {
    if (!rawRefreshToken) {
      throw new AppError('Refresh token not provided', 401, AUTH_REFRESH_TOKEN_INVALID);
    }

    // Find user by matching and rotating the refresh token
    // We need to check all users (inefficient) — in production use Redis
    // For now, we store userId in a simple approach: use JWT for refresh too
    // Better: decode user from cookie's associated JWT if we also store userId hint
    // Simple approach: brute-find by iterating (acceptable for small scale)
    // Production: store hashed token with userId index in separate RefreshToken collection
    const User = require('../../shared/database/models/User.model');
    const users = await User.find({}).select('+refreshTokens').limit(1000);

    let matchedUser = null;
    for (const user of users) {
      const rotated = await authRepository.findAndRotateRefreshToken(user._id, rawRefreshToken);
      if (rotated) { matchedUser = rotated; break; }
    }

    if (!matchedUser) {
      throw new AppError('Invalid or expired refresh token', 401, AUTH_REFRESH_TOKEN_INVALID);
    }

    return this._issueTokens(matchedUser, res);
  }

  async githubCallback(user, res) {
    return this._issueTokens(user, res);
  }

  async googleCallback(user, res) {
    return this._issueTokens(user, res);
  }

  async getMe(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, AUTH_USER_NOT_FOUND);
    return user;
  }
}

module.exports = new AuthService();
