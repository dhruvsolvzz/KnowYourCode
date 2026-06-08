'use strict';
const crypto = require('crypto');
const Repository = require('../../../shared/database/models/Repository.model');
const Commit = require('../../../shared/database/models/Commit.model');
const logger = require('../../../shared/utils/logger');

/**
 * Verify GitHub webhook HMAC-SHA256 signature.
 * MUST use raw body Buffer (express.raw middleware).
 */
const verifyWebhookSignature = async (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const repo = await Repository.findById(req.params.repoId).select('+webhookSecret');
  if (!repo || !repo.webhookSecret) {
    return res.status(404).json({ error: 'Repository or webhook not found' });
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', repo.webhookSecret)
    .update(req.body) // raw Buffer
    .digest('hex');

  try {
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expBuffer.length) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(sigBuffer, expBuffer);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } catch {
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  next();
};

const pushHandler = require('./push.handler');
const prHandler = require('./pr.handler');

const EVENT_HANDLERS = {
  push: pushHandler,
  pull_request: prHandler,
};

/**
 * Main webhook dispatcher.
 * Returns 200 immediately, processes event asynchronously.
 */
const handleWebhook = async (req, res) => {
  const eventType = req.headers['x-github-event'];
  const delivery = req.headers['x-github-delivery'];

  // ✅ Always respond 200 fast (GitHub will retry on 5xx, not 2xx)
  res.status(200).json({ received: true, delivery });

  const handler = EVENT_HANDLERS[eventType];
  if (!handler) {
    logger.debug(`Webhook: Unhandled event type: ${eventType}`);
    return;
  }

  try {
    const payload = JSON.parse(req.body.toString());
    await handler(payload, req.params.repoId);
  } catch (err) {
    logger.error(`Webhook handler error (${eventType}):`, err.message);
  }
};

module.exports = { verifyWebhookSignature, handleWebhook };
