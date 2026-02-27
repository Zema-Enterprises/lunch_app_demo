import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const normalizeExpiration = (expiration?: number | null) => {
  if (!expiration && expiration !== 0) return null;
  try {
    return new Date(expiration);
  } catch (error) {
    return null;
  }
};

export const getPushPublicKey = (req: AuthRequest, res: Response) => {
  try {
    const publicKey = process.env.NOTIFICATIONS_VAPID_PUBLIC_KEY || '';

    if (!publicKey) {
      return res.status(503).json({ message: 'Push notifications not configured' });
    }

    return res.json({ data: { publicKey } });
  } catch (error) {
    logger.error('Error loading push public key:', error);
    return res.status(500).json({ message: 'Failed to load push public key' });
  }
};

export const getPushSubscriptions = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: req.user.userId },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    });

    return res.json({
      data: {
        subscriptions,
        count: subscriptions.length,
        hasActiveSubscription: subscriptions.length > 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching push subscriptions:', error);
    return res.status(500).json({ message: 'Failed to fetch push subscriptions' });
  }
};

export const registerPushSubscription = async (req: AuthRequest, res: Response) => {
  const { endpoint, keys, expirationTime, userAgent } = req.body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'Invalid subscription payload' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
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
  } catch (error) {
    logger.error('Error registering push subscription:', error);
    return res.status(500).json({ message: 'Failed to register push subscription' });
  }
};

export const deletePushSubscription = async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body ?? {};

  if (!endpoint) {
    return res.status(400).json({ message: 'Endpoint is required' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: req.user.userId,
      },
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting push subscription:', error);
    return res.status(500).json({ message: 'Failed to delete push subscription' });
  }
};
