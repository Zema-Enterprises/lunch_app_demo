import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { exportToHoneycomb } from '../../telemetry/honeycomb.exporter';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const originalEnv = { ...process.env };

describe('honeycomb exporter', () => {
  beforeEach(() => {
    env.NOTIFICATIONS_TELEMETRY_ENABLED = 'true';
    env.NOTIFICATIONS_HONEYCOMB_API_KEY = 'test-key';
    env.NOTIFICATIONS_HONEYCOMB_DATASET = 'test-dataset';
    env.NOTIFICATIONS_HONEYCOMB_API_URL = 'https://api.test-honeycomb.io';
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    // @ts-expect-error allow cleanup
    global.fetch = undefined;
    jest.restoreAllMocks();
    env.NOTIFICATIONS_TELEMETRY_ENABLED = originalEnv.NOTIFICATIONS_TELEMETRY_ENABLED ?? 'false';
    env.NOTIFICATIONS_HONEYCOMB_API_KEY = originalEnv.NOTIFICATIONS_HONEYCOMB_API_KEY || '';
    env.NOTIFICATIONS_HONEYCOMB_DATASET = originalEnv.NOTIFICATIONS_HONEYCOMB_DATASET || '';
    env.NOTIFICATIONS_HONEYCOMB_API_URL =
      originalEnv.NOTIFICATIONS_HONEYCOMB_API_URL || 'https://api.honeycomb.io/1/events';
  });

  it('skips export when fetch is unavailable', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    // @ts-expect-error force missing fetch
    delete global.fetch;

    await exportToHoneycomb({ data: { foo: 'bar' } }, 'test_event');

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('invokes fetch with expected payload when enabled', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true })) as jest.Mock;
    // @ts-expect-error override global fetch
    global.fetch = fetchMock;

    await exportToHoneycomb(
      { data: { foo: 'bar', metric: 'test_metric' }, timestamp: '2025-10-19T12:34:56.000Z' },
      'test_event'
    );

    expect(fetchMock).toHaveBeenCalledWith('https://api.test-honeycomb.io', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Honeycomb-Team': 'test-key',
        'X-Honeycomb-Dataset': 'test-dataset',
      },
      body: JSON.stringify({
        data: { foo: 'bar', metric: 'test_metric' },
        time: '2025-10-19T12:34:56.000Z',
        metadata: { eventType: 'test_event' },
      }),
    });
  });

  it('does not export when telemetry disabled', async () => {
    env.NOTIFICATIONS_TELEMETRY_ENABLED = 'false';
    const fetchMock = jest.fn();
    // @ts-expect-error override
    global.fetch = fetchMock;

    await exportToHoneycomb({ data: { foo: 'bar' } }, 'test_event');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
