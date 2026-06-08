'use strict';
const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false, minlength: 8 }, // null for OAuth users

  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },

  // Password reset
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },

  // GitHub OAuth
  githubId: { type: String, unique: true, sparse: true },
  githubAccessToken: { type: String, select: false },
  githubUsername: String,
  githubAvatarUrl: String,

  // Google OAuth
  googleId: { type: String, unique: true, sparse: true },
  googleAccessToken: { type: String, select: false },
  googleAvatarUrl: String,

  // Refresh tokens (stored hashed, single-use)
  refreshTokens: [{
    token: { type: String, select: false },
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Active access tokens (for stateful verification and instant revocation)
  accessTokens: { type: [String], select: false },

  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes removed due to uniqueness defined in schema

// Pre-save: hash password + update timestamp
UserSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance: compare passwords
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Instance: remove sensitive fields from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.refreshTokens;
  delete obj.githubAccessToken;
  delete obj.googleAccessToken;
  delete obj.accessTokens;
  return obj;
};

module.exports = model('User', UserSchema);
