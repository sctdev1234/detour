const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');

class IdempotencyService {
  /**
   * Generates a deterministic hash for the request payload
   */
  hashPayload(payload) {
    return crypto
      .createHash('sha256')
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload || {}))
      .digest('hex');
  }

  /**
   * Acquire idempotency lock or retrieve cached response.
   * @param {string} key - Client-provided Idempotency-Key
   * @param {string} userId - Requesting user ID
   * @param {string} endpoint - API route path
   * @param {Object} payload - Request body/params
   * @param {number} ttlHours - Expiry duration
   * @returns {Promise<{ isDuplicate: boolean, inFlight?: boolean, cachedResponse?: Object }>}
   */
  async acquireLock(key, userId, endpoint, payload, ttlHours = 24) {
    if (!key) {
      return { isDuplicate: false };
    }

    const requestHash = this.hashPayload(payload);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    try {
      await IdempotencyKey.create({
        key,
        userId,
        endpoint,
        requestHash,
        status: 'IN_FLIGHT',
        expiresAt
      });

      return { isDuplicate: false };
    } catch (err) {
      // Duplicate key error (E11000)
      if (err.code === 11000) {
        const existing = await IdempotencyKey.findOne({ key });
        if (!existing) {
          return { isDuplicate: false };
        }

        if (existing.status === 'IN_FLIGHT') {
          return { isDuplicate: true, inFlight: true };
        }

        if (existing.status === 'COMPLETED') {
          return {
            isDuplicate: true,
            inFlight: false,
            cachedResponse: {
              status: existing.responseStatus,
              body: existing.responseBody
            }
          };
        }
      }
      throw err;
    }
  }

  /**
   * Save completed response for an idempotency key.
   */
  async saveResponse(key, responseStatus, responseBody) {
    if (!key) return;

    await IdempotencyKey.findOneAndUpdate(
      { key },
      {
        $set: {
          status: 'COMPLETED',
          responseStatus,
          responseBody,
          completedAt: new Date()
        }
      }
    );
  }

  /**
   * Mark idempotency key as failed if operation encountered error.
   */
  async releaseLock(key) {
    if (!key) return;
    await IdempotencyKey.deleteOne({ key, status: 'IN_FLIGHT' });
  }
}

module.exports = new IdempotencyService();
