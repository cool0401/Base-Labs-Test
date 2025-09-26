const request = require('supertest');
const { createApp } = require('./app');

class MockRedis {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
    this.autoIncrementValues = new Map();
    this.currentTime = Date.now();
  }

  _cleanupExpired() {
    const now = this.currentTime;
    for (const [key, expiry] of this.expirations.entries()) {
      if (expiry <= now) {
        this.store.delete(key);
        this.expirations.delete(key);
      }
    }
  }

  async set(key, value, mode, ttl, condition) {
    this._cleanupExpired();

    if (condition === 'NX' && this.store.has(key)) {
      return null;
    }

    this.store.set(key, value);

    if (mode === 'EX') {
      const expiryTime = this.currentTime + ttl * 1000;
      this.expirations.set(key, expiryTime);
    }

    return 'OK';
  }

  async ttl(key) {
    this._cleanupExpired();

    if (!this.store.has(key)) {
      return -2;
    }

    if (!this.expirations.has(key)) {
      return -1;
    }

    const ttlMs = this.expirations.get(key) - this.currentTime;
    return Math.ceil(ttlMs / 1000);
  }

  async incr(key) {
    this._cleanupExpired();
    const current = Number(this.store.get(key) ?? 0);
    const next = current + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key, ttlSeconds) {
    if (!this.store.has(key)) {
      return 0;
    }
    this.expirations.set(key, this.currentTime + ttlSeconds * 1000);
    return 1;
  }

  async get(key) {
    this._cleanupExpired();
    const value = this.store.get(key);
    return value === undefined ? null : value;
  }

  async ping() {
    return 'PONG';
  }
}

describe('Corn rate limiter API', () => {
  let redis;
  let app;

  beforeEach(() => {
    redis = new MockRedis();
    app = createApp({ redis, windowSeconds: 60, logger: console });
  });

  test('allows first purchase and stores counters', async () => {
    const response = await request(app)
      .post('/buy-corn')
      .send({ clientId: 'client-123' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Corn purchased successfully 🌽',
        totalPurchases: 1,
        retryAfterSeconds: 60,
      })
    );

    const status = await request(app).get('/status/client-123').expect(200);
    expect(status.body).toEqual(
      expect.objectContaining({
        clientId: 'client-123',
        totalPurchases: 1,
        canPurchase: false,
      })
    );
  });

  test('rate limits subsequent purchase within window', async () => {
    await request(app).post('/buy-corn').send({ clientId: 'client-123' }).expect(200);

    const second = await request(app)
      .post('/buy-corn')
      .send({ clientId: 'client-123' })
      .expect(429);

    expect(second.body).toEqual(
      expect.objectContaining({
        message: 'Too Many Requests 🌽',
        retryAfterSeconds: expect.any(Number),
      })
    );
  });

  test('missing clientId returns validation error', async () => {
    await request(app).post('/buy-corn').send({}).expect(400);
  });

  test('health endpoint reports redis availability', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', redis: 'PONG' });
  });
});

