'use strict';
const axios = require('axios');
const logger = require('../../../shared/utils/logger');

/**
 * Extracts owner/repo from GitHub URLs:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 */
const parseGithubUrl = (url) => {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.\s]+?)(?:\.git)?(?:\/|$)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2] };
};

const getHeaders = (accessToken) => {
  const token = accessToken || process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleApiError = (err, url) => {
  if (err.response && err.response.status === 403) {
    const remaining = err.response.headers['x-ratelimit-remaining'];
    if (remaining === '0') {
      throw new Error(`GitHub API rate limit exceeded. Please configure GITHUB_TOKEN in backend/.env file.`);
    }
  }
  throw err;
};

/**
 * Fetch repo metadata from GitHub REST API.
 */
const fetchRepoMetadata = async (owner, repo, accessToken) => {
  const headers = getHeaders(accessToken);
  try {
    const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    return data;
  } catch (err) {
    handleApiError(err);
  }
};

/**
 * Fetch language breakdown.
 */
const fetchLanguages = async (owner, repo, accessToken) => {
  const headers = getHeaders(accessToken);
  try {
    const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
    const total = Object.values(data).reduce((s, b) => s + b, 0);
    return Object.entries(data).map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / total) * 100),
    }));
  } catch (err) {
    handleApiError(err);
  }
};

/**
 * Fetch the entire file tree in ONE API call (recursive).
 */
const fetchFileTree = async (owner, repo, branch, accessToken) => {
  const headers = getHeaders(accessToken);
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );
    return data.tree || [];
  } catch (err) {
    handleApiError(err);
  }
};

/**
 * Fetch file content from GitHub (base64 encoded).
 */
const fetchFileContent = async (owner, repo, filePath, accessToken, source, repoId) => {
  if (source === 'zip_upload') {
    const fs = require('fs');
    const path = require('path');
    const AdmZip = require('adm-zip');
    
    try {
      const zipPath = path.join(__dirname, '../../../../uploads', `${repoId}.zip`);
      if (fs.existsSync(zipPath)) {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        
        const topLevelDirs = new Set();
        for (const entry of entries) {
          const firstPart = entry.entryName.split('/')[0];
          if (firstPart) topLevelDirs.add(firstPart);
        }
        let rootPrefix = '';
        if (topLevelDirs.size === 1) {
          rootPrefix = [...topLevelDirs][0] + '/';
        }
        
        const zipEntryName = rootPrefix + filePath;
        const entry = zip.getEntry(zipEntryName);
        if (entry) {
          return entry.getData().toString('utf-8');
        } else {
          const fallbackEntry = zip.getEntry(filePath);
          if (fallbackEntry) return fallbackEntry.getData().toString('utf-8');
        }
      }
      return null;
    } catch (err) {
      logger.warn(`Could not fetch zip content for ${filePath}: ${err.message}`);
      return null;
    }
  }

  const headers = getHeaders(accessToken);
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers }
    );
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return data.content || '';
  } catch (err) {
    if (err.response && err.response.status === 403 && err.response.headers['x-ratelimit-remaining'] === '0') {
      throw new Error(`GitHub API rate limit exceeded while fetching file content. Please configure GITHUB_TOKEN in backend/.env file.`);
    }
    logger.warn(`Could not fetch ${filePath}: ${err.message}`);
    return null;
  }
};

/**
 * Fetch commits (paginated).
 */
const fetchCommits = async (owner, repo, { page = 1, perPage = 30 } = {}, accessToken) => {
  const headers = getHeaders(accessToken);
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`,
      { headers }
    );
    return data;
  } catch (err) {
    handleApiError(err);
  }
};

module.exports = {
  parseGithubUrl,
  fetchRepoMetadata,
  fetchLanguages,
  fetchFileTree,
  fetchFileContent,
  fetchCommits,
};

