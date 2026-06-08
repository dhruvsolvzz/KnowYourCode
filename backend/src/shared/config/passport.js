'use strict';
const passport = require('passport');
const { Strategy: GitHubStrategy } = require('passport-github2');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const config = require('./index');
const UserRepository = require('../../features/auth/auth.repository');
const logger = require('../utils/logger');

// Only register GitHub strategy if real credentials are provided
const isGithubConfigured =
  !!(config.github.clientId &&
  config.github.clientSecret &&
  !config.github.clientId.startsWith('<') &&
  !config.github.clientSecret.startsWith('<'));

if (isGithubConfigured) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.github.clientId,
        clientSecret: config.github.clientSecret,
        callbackURL: config.github.callbackUrl,
        scope: ['user:email', 'repo'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ||
            `${profile.username}@github.noreply.com`;

          // Find or create user
          let user = await UserRepository.findByGithubId(profile.id);

          if (!user) {
            // Check if email exists (link accounts)
            user = await UserRepository.findByEmail(email);

            if (user) {
              // Link GitHub to existing account
              user = await UserRepository.linkGithubAccount(user._id, {
                githubId: profile.id,
                githubAccessToken: accessToken,
                githubUsername: profile.username,
                githubAvatarUrl: profile.photos?.[0]?.value,
                isEmailVerified: true,
              });
            } else {
              // Create new user from GitHub
              user = await UserRepository.create({
                name: profile.displayName || profile.username,
                email,
                githubId: profile.id,
                githubAccessToken: accessToken,
                githubUsername: profile.username,
                githubAvatarUrl: profile.photos?.[0]?.value,
                isEmailVerified: true,
              });
            }
          } else {
            // Update access token
            user = await UserRepository.updateGithubToken(user._id, accessToken);
          }

          return done(null, user);
        } catch (err) {
          logger.error('GitHub OAuth error:', err);
          return done(err);
        }
      }
    )
  );
} else {
  logger.warn('⚠️  GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env to enable it.');
}

// Only register Google strategy if real credentials are provided
const isGoogleConfigured =
  !!(config.google.clientId &&
  config.google.clientSecret &&
  !config.google.clientId.startsWith('<') &&
  !config.google.clientSecret.startsWith('<'));

if (isGoogleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.id}@google.noreply.com`;

          // Find or create user
          let user = await UserRepository.findByGoogleId(profile.id);

          if (!user) {
            // Check if email exists (link accounts)
            user = await UserRepository.findByEmail(email);

            if (user) {
              // Link Google to existing account
              user = await UserRepository.linkGoogleAccount(user._id, {
                googleId: profile.id,
                googleAccessToken: accessToken,
                googleAvatarUrl: profile.photos?.[0]?.value,
                isEmailVerified: true,
              });
            } else {
              // Create new user from Google
              user = await UserRepository.create({
                name: profile.displayName || email.split('@')[0],
                email,
                googleId: profile.id,
                googleAccessToken: accessToken,
                googleAvatarUrl: profile.photos?.[0]?.value,
                isEmailVerified: true,
              });
            }
          } else {
            // Update access token
            user = await UserRepository.updateGoogleToken(user._id, accessToken);
          }

          return done(null, user);
        } catch (err) {
          logger.error('Google OAuth error:', err);
          return done(err);
        }
      }
    )
  );
} else {
  logger.warn('⚠️  Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable it.');
}

// Passport doesn't use sessions — we use JWT
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserRepository.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = { isGithubConfigured, isGoogleConfigured };
