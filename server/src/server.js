require('dotenv').config();

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;

let redis;

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL is required in production');
  }

  const RedisMock = require('ioredis-mock');
  console.warn('REDIS_URL not set, using in-memory Redis mock. Do not use in production.');
  redis = new RedisMock();
} else {
  const Redis = require('ioredis');
  redis = new Redis(redisUrl);
}

const app = createApp({ redis, logger: console });

app.listen(port, () => {
  console.log(`Bob's corn stand listening on port ${port}`);
});

