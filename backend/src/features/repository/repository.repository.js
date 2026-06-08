'use strict';
const Repository = require('../../shared/database/models/Repository.model');
const Commit = require('../../shared/database/models/Commit.model');

class RepositoryRepository {
  async create(data) {
    return Repository.create(data);
  }

  async findById(id) {
    return Repository.findById(id);
  }

  async findByIdAndUserId(id, userId) {
    return Repository.findOne({ _id: id, userId });
  }

  async findOne(query) {
    return Repository.findOne(query);
  }

  async findAllByUser(userId, { skip, limit } = {}) {
    return Repository.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip || 0)
      .limit(limit || 20);
  }

  async countByUser(userId) {
    return Repository.countDocuments({ userId });
  }

  async findByGithubRepoId(githubRepoId) {
    return Repository.findOne({ githubRepoId });
  }

  async update(id, data) {
    return Repository.findByIdAndUpdate(id, { ...data, updatedAt: Date.now() }, { new: true });
  }

  async setAnalysisStatus(id, status) {
    return Repository.findByIdAndUpdate(id, {
      analysisStatus: status,
      ...(status === 'completed' && { lastAnalyzedAt: new Date() }),
      updatedAt: Date.now(),
    }, { new: true });
  }

  async delete(id) {
    return Repository.findByIdAndDelete(id);
  }

  async getCommits(repositoryId, { skip, limit } = {}) {
    return Commit.find({ repositoryId })
      .sort({ timestamp: -1 })
      .skip(skip || 0)
      .limit(limit || 30);
  }

  async countCommits(repositoryId) {
    return Commit.countDocuments({ repositoryId });
  }
}

module.exports = new RepositoryRepository();
