'use strict';
const { Schema, model } = require('mongoose');

const CommitSchema = new Schema({
  repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  sha: { type: String, required: true, unique: true },
  message: String,
  author: {
    name: String,
    email: String,
    username: String,
    avatarUrl: String,
  },
  timestamp: Date,
  url: String,

  changedFiles: [{
    filename: String,
    status: { type: String, enum: ['added', 'modified', 'removed', 'renamed'] },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    patch: String,
  }],

  aiAnalysis: {
    summary: String,
    whatChanged: String,
    whyItChanged: String,
    affectedModules: [String],
    impactLevel: { type: String, enum: ['low', 'medium', 'high'] },
    flowDescription: String,
    generatedAt: Date,
  },

  analysisStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  analysisRetries: { type: Number, default: 0 },
  source: {
    type: String,
    enum: ['webhook', 'manual', 'initial_scan'],
    default: 'webhook',
  },
  createdAt: { type: Date, default: Date.now },
});

CommitSchema.index({ repositoryId: 1, timestamp: -1 });
CommitSchema.index({ repositoryId: 1, analysisStatus: 1 });

module.exports = model('Commit', CommitSchema);
