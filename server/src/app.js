const express = require('express');
const cors = require('cors');

const DEFAULT_WINDOW_SECONDS = 60;
const PURCHASE_RETENTION_SECONDS = 60 * 60 * 24 * 30; // 30 days

const createApp = ({ redis, windowSeconds = DEFAULT_WINDOW_SECONDS, logger = console } = {}) => {
  if (!redis) {
    throw new Error('A Redis client instance is required to create the app');
  }

  const app = express();

  app.use(cors());
  app.use(express.json());

  const getRateLimitKey = (clientId) => `corn:rate:${clientId}`;
  const getPurchaseCountKey = (clientId) => `corn:count:${clientId}`;

  const getRetryAfterSeconds = async (key) => {
    const ttl = await redis.ttl(key);
    if (ttl === null || ttl < 0) {
      return windowSeconds;
    }
    return ttl;
  };

  app.post('/buy-corn', async (req, res) => {
    const { clientId } = req.body ?? {};

    if (!clientId) {
      return res.status(400).json({
        message: 'clientId is required to buy corn',
      });
    }

    try {
      const rateKey = getRateLimitKey(clientId);

      // Only allow setting the key when it does not already exist (NX)
      const setResult = await redis.set(rateKey, 1, 'EX', windowSeconds, 'NX');

      if (setResult === null) {
        const retryAfterSeconds = await getRetryAfterSeconds(rateKey);
        return res.status(429).json({
          message: 'Too Many Requests 🌽',
          retryAfterSeconds,
        });
      }

      const countKey = getPurchaseCountKey(clientId);
      const totalPurchases = await redis.incr(countKey);
      await redis.expire(countKey, PURCHASE_RETENTION_SECONDS);

      return res.status(200).json({
        message: 'Corn purchased successfully 🌽',
        totalPurchases,
        retryAfterSeconds: windowSeconds,
      });
    } catch (error) {
      logger.error?.('Error processing purchase request', error);
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  });

  app.get('/status/:clientId', async (req, res) => {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        message: 'clientId is required',
      });
    }

    try {
      const rateKey = getRateLimitKey(clientId);
      const countKey = getPurchaseCountKey(clientId);

      const [ttl, total] = await Promise.all([
        redis.ttl(rateKey),
        redis.get(countKey),
      ]);

      return res.status(200).json({
        clientId,
        canPurchase: ttl <= 0,
        retryAfterSeconds: ttl > 0 ? ttl : 0,
        totalPurchases: total ? Number(total) : 0,
      });
    } catch (error) {
      logger.error?.('Error fetching client status', error);
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  });

  app.get('/health', async (req, res) => {
    try {
      const result = await redis.ping();
      return res.status(200).json({ status: 'ok', redis: result });
    } catch (error) {
      logger.error?.('Health check failed', error);
      return res.status(500).json({ status: 'error', message: 'Redis unavailable' });
    }
  });

  app.get('/', (req, res) => {
    res.status(200).json({ message: "Bob's Corn rate limiter is steady as she goes" });
  });

  return app;
};

module.exports = { createApp };

