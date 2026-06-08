'use strict';
const { Schema, model } = require('mongoose');

const EmbeddingSchema = new Schema({
  repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true },
  filePath: { type: String, required: true },
  chunkIndex: { type: Number, default: 0 },
  content: String, // raw code chunk
  embedding: [Number], // vector embedding for semantic search
  metadata: {
    fileType: String,
    layer: String, // 'component' | 'route' | 'controller' | 'service' | 'model'
    exports: [String],
    imports: [String],
    tokenCount: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

EmbeddingSchema.index({ repositoryId: 1 });
EmbeddingSchema.index({ repositoryId: 1, filePath: 1 });
// Atlas Vector Search index created separately in Atlas UI on the 'embedding' field

module.exports = model('Embedding', EmbeddingSchema);
