import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
  recordDeliveryTelemetry,
  recordRealtimeConnection,
  recordRealtimeDelivery,
} from '../../telemetry/notifications.telemetry';
import { logger } from '../../utils/logger';
import { NotificationDeliveryChannel, NotificationDeliveryStatus } from '@prisma/client';

describe('notifications telemetry', () => {
  const originalEnv = process.env.NOTIFICATIONS_TELEMETRY_ENABLED;

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnv === undefined) {
      delete process.env.NOTIFICATIONS_TELEMETRY_ENABLED;
    } else {
      process.env.NOTIFICATIONS_TELEMETRY_ENABLED = originalEnv;
    }
  });

  it('does not log when telemetry disabled', () => {
    process.env.NOTIFICATIONS_TELEMETRY_ENABLED = 'false';

    recordDeliveryTelemetry({
      notificationId: 'notif',
      userId: 'user',
      companyId: 'company',
      channel: NotificationDeliveryChannel.PUSH,
      status: NotificationDeliveryStatus.SUCCESS,
      latencyMs: 120,
    });
    recordRealtimeConnection({
      status: 'connected',
      userId: 'user',
      companyId: 'company',
      connectionId: 'conn',
      activeConnections: 1,
    });
    recordRealtimeDelivery({
      companyId: 'company',
      notificationId: 'notif',
      eventName: 'notification.created',
      latencyMs: 10,
    });

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs delivery metrics when telemetry enabled', () => {
    process.env.NOTIFICATIONS_TELEMETRY_ENABLED = 'true';

    recordDeliveryTelemetry({
      notificationId: 'notif',
      userId: 'user',
      companyId: 'company',
      channel: NotificationDeliveryChannel.PUSH,
      status: NotificationDeliveryStatus.SUCCESS,
      latencyMs: 120,
    });

    expect(logger.info).toHaveBeenCalledWith(
      'notification_delivery',
      expect.objectContaining({
        notificationId: 'notif',
        channel: 'PUSH',
        status: 'SUCCESS',
        latencyMs: 120,
      })
    );
  });

  it('logs realtime connection and delivery metrics when telemetry enabled', () => {
    process.env.NOTIFICATIONS_TELEMETRY_ENABLED = 'true';

    recordRealtimeConnection({
      status: 'connected',
      userId: 'user',
      companyId: 'company',
      connectionId: 'conn',
      activeConnections: 1,
    });

    recordRealtimeDelivery({
      companyId: 'company',
      userId: 'user',
      notificationId: 'notif',
      eventName: 'notification.created',
      latencyMs: 42,
      target: 'user',
    });

    expect(logger.info).toHaveBeenCalledWith(
      'notifications_ws_connection',
      expect.objectContaining({
        metric: 'notifications_ws_connected',
        status: 'connected',
        userId: 'user',
        companyId: 'company',
        activeConnections: 1,
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'notifications_ws_delivery',
      expect.objectContaining({
        metric: 'notifications_ws_delivery_ms',
        companyId: 'company',
        userId: 'user',
        notificationId: 'notif',
        latencyMs: 42,
        eventName: 'notification.created',
        target: 'user',
      })
    );
  });
});
