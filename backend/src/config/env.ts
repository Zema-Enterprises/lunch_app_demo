import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const ensureJwtSecret = () => {
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be defined and at least 32 characters long. Update your environment configuration.'
    );
  }
  return secret;
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: ensureJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: nodeEnv,
  FRONTEND_APP_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
  REFRESH_TOKEN_EXPIRES_IN_DAYS: parsePositiveInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS, 30),
  REFRESH_TOKEN_COOKIE_SECURE: parseBoolean(process.env.REFRESH_TOKEN_COOKIE_SECURE, nodeEnv === 'production'),
  NOTIFICATIONS_VAPID_PUBLIC_KEY: process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY || '',
  NOTIFICATIONS_VAPID_PRIVATE_KEY: process.env.NOTIFICATIONS_VAPID_PRIVATE_KEY || '',
  NOTIFICATIONS_VAPID_CONTACT: process.env.NOTIFICATIONS_VAPID_CONTACT || 'mailto:support@lunchsync.com',
  NOTIFICATIONS_TELEMETRY_ENABLED: process.env.NOTIFICATIONS_TELEMETRY_ENABLED || 'false',
  NOTIFICATIONS_HONEYCOMB_API_KEY: process.env.NOTIFICATIONS_HONEYCOMB_API_KEY || '',
  NOTIFICATIONS_HONEYCOMB_DATASET: process.env.NOTIFICATIONS_HONEYCOMB_DATASET || '',
  NOTIFICATIONS_HONEYCOMB_API_URL: process.env.NOTIFICATIONS_HONEYCOMB_API_URL || 'https://api.honeycomb.io/1/events',
  INVITE_TTL_DAYS: parsePositiveInt(process.env.INVITE_TTL_DAYS, 7),
  INVITE_EMAIL_PROVIDER:
    process.env.INVITE_EMAIL_PROVIDER ||
    (nodeEnv === 'production' ? 'resend' : 'console'),
  INVITE_EMAIL_FROM: process.env.INVITE_EMAIL_FROM || 'LunchSync Invites <onboarding@resend.dev>',
  INVITE_EMAIL_REPLY_TO: process.env.INVITE_EMAIL_REPLY_TO || 'onboarding@resend.dev',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
};
