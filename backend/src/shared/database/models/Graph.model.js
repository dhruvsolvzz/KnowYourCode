'use strict';
const { Schema, model } = require('mongoose');

const GraphSchema = new Schema({
  repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  type: {
    type: String,
    enum: ['full_architecture', 'data_flow', 'dependency', 'commit_impact'],
    required: true,
  },
  nodes: {
    type: [new Schema({
      id: String,
      type: String,
      position: { x: Number, y: Number },
      data: Schema.Types.Mixed,
    }, { strict: false, _id: false })],
    default: [],
  },
  edges: {
    type: [new Schema({
      id: String,
      source: String,
      target: String,
      type: String,
      animated: { type: Boolean, default: false },
      label: String,
      data: Schema.Types.Mixed,
    }, { strict: false, _id: false })],
    default: [],
  },

  // Flow-specific AI-generated fields
  queryContext: String,
  description: String,          // AI narrative description of the flow
  entryPoint: String,           // File where execution starts
  flowSteps: {                  // Step-by-step execution trace
    type: [Schema.Types.Mixed],
    default: [],
  },
  dataTransformations: {        // Data passed between each step
    type: [Schema.Types.Mixed],
    default: [],
  },

  commitSha: String,            // for commit_impact graphs
  generatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
});

GraphSchema.index({ repositoryId: 1, type: 1 });
GraphSchema.index({ repositoryId: 1, commitSha: 1 });

module.exports = model('Graph', GraphSchema);

