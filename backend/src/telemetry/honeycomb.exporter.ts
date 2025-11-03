import { env } from '../config/env';
import { logger } from '../utils/logger';

type HoneycombEvent = {
  data: Record<string, unknown>;
  timestamp?: string;
};

const HONEYCOMB_ENABLED = () =>
  env.NOTIFICATIONS_TELEMETRY_ENABLED === 'true' &&
  Boolean(env.NOTIFICATIONS_HONEYCOMB_API_KEY && env.NOTIFICATIONS_HONEYCOMB_DATASET);

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Honeycomb-Team': env.NOTIFICATIONS_HONEYCOMB_API_KEY,
  'X-Honeycomb-Dataset': env.NOTIFICATIONS_HONEYCOMB_DATASET,
});

export const exportToHoneycomb = async (event: HoneycombEvent, eventType: string) => {
  if (!HONEYCOMB_ENABLED()) {
    return;
  }

  if (typeof fetch !== 'function') {
    logger.warn('Honeycomb export skipped: fetch not available');
    return;
  }

  try {
    await fetch(env.NOTIFICATIONS_HONEYCOMB_API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        data: event.data,
        time: event.timestamp ?? new Date().toISOString(),
        metadata: { eventType },
      }),
    });
  } catch (error) {
    logger.error('Honeycomb export failed', { eventType, error });
  }
};
