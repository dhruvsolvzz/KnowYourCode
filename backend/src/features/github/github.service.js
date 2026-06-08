'use strict';
const axios = require('axios');
const crypto = require('crypto');
const AppError = require('../../shared/utils/AppError');
const Repository = require('../../shared/database/models/Repository.model');
const User = require('../../shared/database/models/User.model');
const config = require('../../shared/config');
const logger = require('../../shared/utils/logger');

class GitHubService {
  async listUserRepos(user) {
    if (!user.githubAccessToken) {
      throw new AppError('GitHub account not connected', 400, 'GITHUB_NOT_CONNECTED');
    }
    const { data } = await axios.get('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
    });
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      isPrivate: r.private,
      stars: r.stargazers_count,
      language: r.language,
      updatedAt: r.updated_at,
    }));
  }

  async installWebhook(repoId, user) {
    const repo = await Repository.findOne({ _id: repoId, userId: user._id }).select('+webhookSecret');
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');

    let token = user.githubAccessToken;
    if (!token) {
      const freshUser = await User.findById(user._id).select('+githubAccessToken');
      token = freshUser?.githubAccessToken;
    }

    if (!token) throw new AppError('GitHub not connected', 400, 'GITHUB_NOT_CONNECTED');

    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const webhookUrl = `${config.webhook.baseUrl}/api/v1/github/webhook/${repoId}`;

    const { data } = await axios.post(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/hooks`,
      {
        name: 'web',
        active: true,
        events: ['push', 'pull_request'],
        config: { url: webhookUrl, content_type: 'json', secret: webhookSecret },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await Repository.findByIdAndUpdate(repoId, {
      webhookId: String(data.id),
      webhookSecret,
      webhookEnabled: true,
    });

    logger.info(`Webhook installed for ${repo.owner}/${repo.name}`);
    return { webhookEnabled: true, webhookId: data.id };
  }

  async _getRepoWithToken(repoId) {
    const repo = await Repository.findById(repoId).lean();
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');

    const user = await User.findById(repo.userId).select('+githubAccessToken');
    if (!user || !user.githubAccessToken) {
      throw new AppError('GitHub access token not available', 400, 'GITHUB_NOT_CONNECTED');
    }

    return { repo, token: user.githubAccessToken };
  }

  async fetchPullRequestDiff(repoId, prNumber) {
    const { repo, token } = await this._getRepoWithToken(repoId);
    const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/pulls/${prNumber}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.diff',
      },
      responseType: 'text',
    });
    return response.data;
  }

  async postPullRequestComment(repoId, prNumber, body) {
    const { repo, token } = await this._getRepoWithToken(repoId);
    const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/${prNumber}/comments`;
    const response = await axios.post(url, { body }, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.data;
  }

  async removeWebhook(repoId, user) {
    const repo = await Repository.findOne({ _id: repoId, userId: user._id }).select('+webhookSecret');
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
    if (!repo.webhookId) return { webhookEnabled: false };

    let token = user.githubAccessToken;
    if (!token) {
      const freshUser = await User.findById(user._id).select('+githubAccessToken');
      token = freshUser?.githubAccessToken;
    }

    try {
      await axios.delete(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/hooks/${repo.webhookId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      logger.warn(`Failed to delete webhook from GitHub: ${err.message}`);
    }

    await Repository.findByIdAndUpdate(repoId, {
      webhookId: null,
      webhookSecret: null,
      webhookEnabled: false,
    });

    return { webhookEnabled: false };
  }
}

module.exports = new GitHubService();
