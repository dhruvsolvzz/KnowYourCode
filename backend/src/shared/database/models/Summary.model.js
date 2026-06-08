'use strict';
const { Schema, model } = require('mongoose');

const SummarySchema = new Schema({
  repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['daily', 'weekly', 'repository'], required: true },
  period: {
    startDate: Date,
    endDate: Date,
  },
  stats: {
    totalCommits: { type: Number, default: 0 },
    newRoutes: { type: Number, default: 0 },
    newModels: { type: Number, default: 0 },
    newComponents: { type: Number, default: 0 },
    filesModified: { type: Number, default: 0 },
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 },
    topContributors: [{
      name: String,
      commits: Number,
    }],
    mostModifiedFiles: [{
      path: String,
      changes: Number,
    }],
  },
  aiNarrative: String,
  architectureChanges: [String],
  highlights: [String],
  generatedAt: { type: Date, default: Date.now },
  emailSentAt: Date,
});

SummarySchema.index({ repositoryId: 1, type: 1, generatedAt: -1 });
SummarySchema.index({ userId: 1 });

module.exports = model('Summary', SummarySchema);
