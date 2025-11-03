import { describe, expect, it } from '@jest/globals';
import { buildRedisConfig, DEFAULT_REDIS_URL } from '../../realtime/redis-config';

describe('buildRedisConfig', () => {
  it('uses explicit notifications redis url when provided', () => {
    const config = buildRedisConfig({ NOTIFICATIONS_REDIS_URL: 'redis://cache.example.com:6380' } as any);
    expect(config).toEqual({ url: 'redis://cache.example.com:6380' });
  });

  it('falls back to REDIS_URL', () => {
    const config = buildRedisConfig({ REDIS_URL: 'redis://shared.cache:6379' } as any);
    expect(config).toEqual({ url: 'redis://shared.cache:6379' });
  });

  it('falls back to default and handles TLS flag', () => {
    const config = buildRedisConfig({ NOTIFICATIONS_REDIS_TLS: 'true' } as any);
    expect(config).toEqual({ url: DEFAULT_REDIS_URL, tls: true });
  });
});
