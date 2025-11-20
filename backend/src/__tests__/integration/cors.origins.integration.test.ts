import request from 'supertest';

const originalEnv = { ...process.env };

describe('CORS allowed origins', () => {
  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('allows both apex and www variants of the configured frontend URL', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://lunchsync.com';

    const app = require('../../app').default;

    await request(app)
      .get('/health')
      .set('Origin', 'https://lunchsync.com')
      .expect('access-control-allow-origin', 'https://lunchsync.com')
      .expect(200);

    await request(app)
      .get('/health')
      .set('Origin', 'https://www.lunchsync.com')
      .expect('access-control-allow-origin', 'https://www.lunchsync.com')
      .expect(200);
  });
});
