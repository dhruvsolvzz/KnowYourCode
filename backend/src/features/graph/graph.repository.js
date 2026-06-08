'use strict';
const Graph = require('../../shared/database/models/Graph.model');

class GraphRepository {
  async upsert(repositoryId, type, graphData) {
    return Graph.findOneAndUpdate(
      { repositoryId, type },
      {
        $set: {
          ...graphData,
          repositoryId,
          type,
          generatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: false }
    );
  }

  async findByRepoAndType(repositoryId, type) {
    return Graph.findOne({ repositoryId, type }).sort({ generatedAt: -1 });
  }

  async findByRepoCommit(repositoryId, commitSha) {
    return Graph.findOne({ repositoryId, commitSha, type: 'commit_impact' });
  }

  async create(data) {
    return Graph.create(data);
  }
}

module.exports = new GraphRepository();
