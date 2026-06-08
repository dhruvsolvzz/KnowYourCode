'use strict';
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('../../shared/config');
const logger = require('../../shared/utils/logger');

class EmailService {
  constructor() {
    const isOAuth2 = !!(config.email.clientId && config.email.clientSecret && config.email.refreshToken);

    const auth = isOAuth2 ? {
      type: 'OAuth2',
      user: config.email.user,
      clientId: config.email.clientId,
      clientSecret: config.email.clientSecret,
      refreshToken: config.email.refreshToken,
    } : {
      user: config.email.user,
      pass: config.email.pass,
    };

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth,
    });
  }

  _loadTemplate(templateName) {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    return fs.readFileSync(templatePath, 'utf-8');
  }

  _renderTemplate(templateName, variables) {
    let html = this._loadTemplate(templateName);
    Object.entries(variables).forEach(([key, val]) => {
      html = html.replaceAll(`{{${key}}}`, val);
    });
    return html;
  }

  async send(to, subject, html) {
    if (!config.email.user) {
      logger.warn(`📧 Email skipped (no SMTP config): ${subject} → ${to}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });
      logger.info(`📧 Email sent: ${subject} → ${to}`);
    } catch (err) {
      logger.error(`📧 Email failed: ${subject} → ${to}`, err.message);
      // Don't throw — email failure shouldn't crash request
    }
  }

  async sendVerificationEmail(email, name, token) {
    const url = `${config.backend.url}/api/v1/auth/verify-email/${token}`;
    const html = this._renderTemplate('verifyEmail', { name, url, email });
    await this.send(email, 'Verify your KnowYourCode email', html);
  }

  async sendPasswordResetEmail(email, name, token) {
    const url = `${config.frontend.url}/auth/reset-password?token=${token}`;
    const html = this._renderTemplate('resetPassword', { name, url, email });
    await this.send(email, 'Reset your KnowYourCode password', html);
  }

  async sendCommitNotification(email, name, commitData) {
    const html = this._renderTemplate('commitNotification', {
      name,
      repoName: commitData.repoName,
      sha: commitData.sha.slice(0, 7),
      message: commitData.message,
      author: commitData.author,
      impactLevel: commitData.impactLevel || 'low',
      summary: commitData.summary || 'Analysis pending',
      url: commitData.url,
    });
    await this.send(email, `📦 New commit in ${commitData.repoName}`, html);
  }

  async sendWeeklyDigest(email, name, summaryData) {
    const html = this._renderTemplate('weeklyDigest', {
      name,
      repoName: summaryData.repoName,
      totalCommits: summaryData.totalCommits,
      linesAdded: summaryData.linesAdded,
      linesRemoved: summaryData.linesRemoved,
      narrative: summaryData.aiNarrative || 'No activity this week.',
      highlights: (summaryData.highlights || []).map((h) => `<li>${h}</li>`).join(''),
      period: summaryData.period,
      dashboardUrl: `${config.frontend.url}/dashboard`,
    });
    await this.send(email, `📊 Weekly digest: ${summaryData.repoName}`, html);
  }
}

module.exports = new EmailService();
