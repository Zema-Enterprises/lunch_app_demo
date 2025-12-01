import webPush from 'web-push';
import prisma from '../../config/database';
import { NotificationDeliveryChannel, NotificationDeliveryStatus, NotificationEvent } from '@prisma/client';
import { recordDeliveryTelemetry } from '../../telemetry/notifications.telemetry';
import { env } from '../../config/env';

let cachedVapidSignature: string | null = null;

const ensureWebPushConfigured = () => {
  const publicKey = process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.NOTIFICATIONS_VAPID_PRIVATE_KEY || '';
  const contact = env.NOTIFICATIONS_VAPID_CONTACT;

  if (!publicKey || !privateKey) {
    return false;
  }

  const signature = `${publicKey}:${privateKey}:${contact}`;
  if (cachedVapidSignature !== signature) {
    webPush.setVapidDetails(contact, publicKey, privateKey);
    cachedVapidSignature = signature;
  }

  return true;
};

const buildNotificationBody = (notification: NotificationEvent) => {
  const defaultTitle = 'New LunchSync notification';
  const defaultBody = `You have a new ${notification.type.replace(/_/g, ' ').toLowerCase()}`;
  const title = notification.title || defaultTitle;
  const body = notification.body || defaultBody;
  const meta = (notification.meta as any) || {};
  const cta =
    notification.ctaKind || meta.cta
      ? {
          kind: notification.ctaKind ?? meta.cta?.kind,
          id: notification.ctaId ?? meta.cta?.id,
        }
      : undefined;

  const url =
    cta?.kind === 'event'
      ? `/events/${cta.id}`
      : cta?.kind === 'order'
      ? `/orders/${cta.id}`
      : notification.eventId
      ? `/events/${notification.eventId}`
      : '/notifications';

  return JSON.stringify({
    title,
    body,
    url,
    notificationId: notification.id,
    type: notification.type,
    category: notification.category,
    subject: meta.subject,
  });
};

export const dispatchPushNotification = async (notification: NotificationEvent) => {
  if (!ensureWebPushConfigured()) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: notification.userId },
  });

  if (!subscriptions.length) {
    return;
  }

  const payload = buildNotificationBody(notification);
  const start = Date.now();

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification({
          endpoint: subscription.endpoint,
          keys: subscription.keys as { p256dh: string; auth: string },
        } as any, payload);

        const receipt = await prisma.notificationDeliveryReceipt.create({
          data: {
            notificationId: notification.id,
            userId: subscription.userId,
            companyId: subscription.companyId,
            channel: NotificationDeliveryChannel.PUSH,
            status: NotificationDeliveryStatus.SUCCESS,
            latencyMs: Date.now() - start,
            deliveredAt: new Date(),
          },
        });

        recordDeliveryTelemetry({
          notificationId: receipt.notificationId,
          userId: receipt.userId,
          companyId: receipt.companyId,
          channel: receipt.channel,
          status: receipt.status,
          latencyMs: receipt.latencyMs,
        });
      } catch (error: any) {
        const receipt = await prisma.notificationDeliveryReceipt.create({
          data: {
            notificationId: notification.id,
            userId: subscription.userId,
            companyId: subscription.companyId,
            channel: NotificationDeliveryChannel.PUSH,
            status: NotificationDeliveryStatus.FAILED,
            latencyMs: Date.now() - start,
            deliveredAt: new Date(),
            errorCode: error?.statusCode?.toString(),
            errorMessage: error?.message?.slice?.(0, 300) ?? 'Push delivery failed',
          },
        });

        recordDeliveryTelemetry({
          notificationId: receipt.notificationId,
          userId: receipt.userId,
          companyId: receipt.companyId,
          channel: receipt.channel,
          status: receipt.status,
          latencyMs: receipt.latencyMs,
        });

        if (error?.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
        }
      }
    })
  );
};

export const __resetWebPushCacheForTests = () => {
  cachedVapidSignature = null;
};
