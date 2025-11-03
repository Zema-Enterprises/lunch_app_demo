export interface RedisConfig {
  url: string;
  tls?: boolean;
}

export const DEFAULT_REDIS_URL = 'redis://localhost:6379';

export const buildRedisConfig = (env: NodeJS.ProcessEnv = process.env): RedisConfig => {
  const url = env.NOTIFICATIONS_REDIS_URL ?? env.REDIS_URL ?? DEFAULT_REDIS_URL;
  const tls = env.NOTIFICATIONS_REDIS_TLS === 'true';

  return { url, tls: tls || undefined };
};
