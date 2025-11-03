import { NotificationDeliveryStatus, NotificationDeliveryChannel } from '@prisma/client';
import { logger } from '../utils/logger';
import { exportToHoneycomb } from './honeycomb.exporter';

const isTelemetryEnabled = () => process.env.NOTIFICATIONS_TELEMETRY_ENABLED === 'true';

export interface DeliveryReceiptTelemetry {
  notificationId: string;
  userId: string;
  companyId: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  latencyMs: number;
}

export const recordDeliveryTelemetry = (payload: DeliveryReceiptTelemetry) => {
  if (!isTelemetryEnabled()) {
    return;
  }

  const event = {
    notificationId: payload.notificationId,
    userId: payload.userId,
    companyId: payload.companyId,
    channel: payload.channel,
    status: payload.status,
    latencyMs: payload.latencyMs,
  };

  logger.info('notification_delivery', event);
  void exportToHoneycomb({ data: { ...event, metric: 'notification_delivery' } }, 'notification_delivery');
};

type ConnectionStatus = 'connected' | 'disconnected';

export interface RealtimeConnectionTelemetry {
  status: ConnectionStatus;
  userId: string;
  companyId: string;
  connectionId: string;
  activeConnections: number;
}

export interface RealtimeDeliveryTelemetry {
  companyId: string;
  notificationId?: string;
  userId?: string;
  eventName: string;
  latencyMs?: number;
  target?: 'company' | 'user' | 'room';
}

export const recordRealtimeConnection = (payload: RealtimeConnectionTelemetry) => {
  if (!isTelemetryEnabled()) {
    return;
  }

  logger.info('notifications_ws_connection', {
    metric: 'notifications_ws_connected',
    status: payload.status,
    userId: payload.userId,
    companyId: payload.companyId,
    connectionId: payload.connectionId,
    activeConnections: payload.activeConnections,
  });
  void exportToHoneycomb(
    {
      data: {
        metric: 'notifications_ws_connected',
        status: payload.status,
        userId: payload.userId,
        companyId: payload.companyId,
        connectionId: payload.connectionId,
        activeConnections: payload.activeConnections,
      },
    },
    'notifications_ws_connected'
  );
};

export const recordRealtimeDelivery = (payload: RealtimeDeliveryTelemetry) => {
  if (!isTelemetryEnabled()) {
    return;
  }

  logger.info('notifications_ws_delivery', {
    metric: 'notifications_ws_delivery_ms',
    companyId: payload.companyId,
    userId: payload.userId,
    notificationId: payload.notificationId,
    eventName: payload.eventName,
    latencyMs: payload.latencyMs,
    target: payload.target,
  });
  void exportToHoneycomb(
    {
      data: {
        metric: 'notifications_ws_delivery_ms',
        companyId: payload.companyId,
        userId: payload.userId,
        notificationId: payload.notificationId,
        eventName: payload.eventName,
        latencyMs: payload.latencyMs,
        target: payload.target,
      },
    },
    'notifications_ws_delivery_ms'
  );
};
