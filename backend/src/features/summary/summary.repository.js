'use strict';
const Summary = require('../../shared/database/models/Summary.model');

class SummaryRepository {
  async findLatestByRepo(repositoryId) {
    return Summary.findOne({ repositoryId }).sort({ generatedAt: -1 });
  }

  async upsert(repositoryId, userId, type, data) {
    return Summary.findOneAndUpdate(
      { repositoryId, type },
      { ...data, repositoryId, userId, type, generatedAt: new Date() },
      { upsert: true, new: true }
    );
  }
}

module.exports = new SummaryRepository();
