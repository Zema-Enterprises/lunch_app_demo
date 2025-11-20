describe('trust proxy configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('enables trust proxy based on env', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TRUST_PROXY = '1';

    jest.resetModules();
    const app = require('../../app').default;

    expect(app.get('trust proxy')).toBe(1);
  });
});
