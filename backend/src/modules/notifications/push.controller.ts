import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

const normalizeExpiration = (expiration?: number | null) => {
  if (!expiration && expiration !== 0) return null;
  try {
    return new Date(expiration);
  } catch (error) {
    return null;
  }
};

export const getPushPublicKey = (req: AuthRequest, res: Response) => {
  const publicKey = process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY || '';

  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }

  return res.json({ data: { publicKey } });
};

export const registerPushSubscription = async (req: AuthRequest, res: Response) => {
  const { endpoint, keys, expirationTime, userAgent } = req.body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      keys,
      expirationTime: normalizeExpiration(expirationTime),
      userAgent,
      userId: req.user.userId,
      companyId: req.user.companyId,
    },
    create: {
      endpoint,
      keys,
      expirationTime: normalizeExpiration(expirationTime),
      userAgent,
      userId: req.user.userId,
      companyId: req.user.companyId,
    },
  });

  return res.status(201).json({
    data: {
      id: subscription.id,
      endpoint: subscription.endpoint,
      userId: subscription.userId,
      userAgent: subscription.userAgent,
    },
  });
};

export const deletePushSubscription = async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body ?? {};

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      userId: req.user.userId,
    },
  });

  return res.status(204).send();
};
