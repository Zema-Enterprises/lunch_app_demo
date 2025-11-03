import dotenv from 'dotenv';

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  NOTIFICATIONS_VAPID_PUBLIC_KEY: process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY || '',
  NOTIFICATIONS_VAPID_PRIVATE_KEY: process.env.NOTIFICATIONS_VAPID_PRIVATE_KEY || '',
  NOTIFICATIONS_VAPID_CONTACT: process.env.NOTIFICATIONS_VAPID_CONTACT || 'mailto:support@lunchsync.com',
  NOTIFICATIONS_TELEMETRY_ENABLED: process.env.NOTIFICATIONS_TELEMETRY_ENABLED || 'false',
  NOTIFICATIONS_HONEYCOMB_API_KEY: process.env.NOTIFICATIONS_HONEYCOMB_API_KEY || '',
  NOTIFICATIONS_HONEYCOMB_DATASET: process.env.NOTIFICATIONS_HONEYCOMB_DATASET || '',
  NOTIFICATIONS_HONEYCOMB_API_URL: process.env.NOTIFICATIONS_HONEYCOMB_API_URL || 'https://api.honeycomb.io/1/events',
};
