'use strict';
const { Schema, model } = require('mongoose');

const RepositorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['github_oauth', 'public_url', 'zip_upload'], required: true },
  githubRepoId: String,
  url: { type: String },
  name: String,
  owner: String,
  description: String,
  defaultBranch: { type: String, default: 'main' },
  isPrivate: { type: Boolean, default: false },
  stars: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },

  languages: [{
    name: String,
    bytes: Number,
    percentage: Number,
  }],

  importMap: Schema.Types.Mixed,

  totalCommits: { type: Number, default: 0 },
  totalFiles: { type: Number, default: 0 },
  folderStructure: Schema.Types.Mixed,

  importantFiles: [{
    path: String,
    type: {
      type: String,
      enum: ['entry', 'config', 'model', 'route', 'controller', 'service', 'component'],
    },
    role: String,
  }],

  detectedStack: {
    frontend: [String],
    backend: [String],
    database: [String],
    testing: [String],
  },

  // Webhook
  webhookId: String,
  webhookSecret: { type: String, select: false },
  webhookEnabled: { type: Boolean, default: false },

  analysisStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  lastAnalyzedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RepositorySchema.index({ userId: 1 });
RepositorySchema.index({ githubRepoId: 1 });
RepositorySchema.index({ userId: 1, createdAt: -1 });

RepositorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = model('Repository', RepositorySchema);
