import { z } from 'zod';

export const registerPushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
    expirationTime: z.number().nullable().optional(),
    userAgent: z.string().optional(),
  }),
});

export const deletePushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url(),
  }),
});

export const updateNotificationSettingsSchema = z.object({
  body: z.object({
    emailEnabled: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    notifyOnEventCreated: z.boolean().optional(),
    notifyOnOrderPlaced: z.boolean().optional(),
    notifyOnDeadlineApproaching: z.boolean().optional(),
    notifyOnEventClosed: z.boolean().optional(),
    notifyOnPaymentConfirmed: z.boolean().optional(),
    notifyOnEventCompleted: z.boolean().optional(),
  }),
});
