import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

const mapNotificationResponse = (notification: any) => {
  const meta = (notification.meta as any) || {};
  const subject =
    meta.subject ||
    (notification.event
      ? {
          eventId: notification.event.id,
          eventTitle: notification.event.title,
          restaurantName: notification.event.restaurant?.name,
        }
      : undefined);

  const actor =
    notification.actor || meta.actor
      ? {
          id: notification.actor?.id ?? meta.actor?.id,
          name: notification.actor?.name ?? meta.actor?.name,
        }
      : undefined;

  const cta =
    notification.ctaKind || meta.cta
      ? {
          kind: notification.ctaKind ?? meta.cta?.kind,
          id: notification.ctaId ?? meta.cta?.id,
        }
      : undefined;

  return {
    ...notification,
    subject,
    actor,
    cta,
  };
};

/**
 * Get all notifications for the authenticated user
 * Query params: unreadOnly (optional), limit (optional)
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const where: any = {
      userId,
    };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notificationEvent.findMany({
      where,
      include: {
        event: {
          include: {
            restaurant: true,
          },
        },
        order: true,
        actor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    res.json({ data: notifications.map(mapNotificationResponse) });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

/**
 * Get notification statistics (unread count, total count)
 */
export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [unread, total] = await Promise.all([
      prisma.notificationEvent.count({
        where: {
          userId,
          read: false,
        },
      }),
      prisma.notificationEvent.count({
        where: {
          userId,
        },
      }),
    ]);

    res.json({
      data: {
        unread,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Failed to fetch notification stats' });
  }
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Verify notification belongs to user
    const notification = await prisma.notificationEvent.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await prisma.notificationEvent.update({
      where: { id },
      data: { read: true },
    });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    await prisma.notificationEvent.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};

/**
 * Get user notification settings
 */
export const getNotificationSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userNotificationSettings.create({
        data: {
          userId,
          emailEnabled: false,
          inAppEnabled: true,
          notifyOnEventCreated: true,
          notifyOnOrderPlaced: true,
          notifyOnDeadlineApproaching: true,
          notifyOnEventClosed: true,
          notifyOnPaymentConfirmed: true,
          notifyOnEventCompleted: true,
        },
      });
    }

    res.json({
      data: {
        ...settings,
        emailNotifications: settings.emailEnabled,
        inAppNotifications: settings.inAppEnabled,
      },
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Failed to fetch notification settings' });
  }
};

/**
 * Update user notification settings
 */
export const updateNotificationSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updates = req.body as any;

    const normalized: any = {
      emailEnabled: updates.emailEnabled ?? updates.emailNotifications,
      inAppEnabled: updates.inAppEnabled ?? updates.inAppNotifications,
      notifyOnEventCreated: updates.notifyOnEventCreated,
      notifyOnOrderPlaced: updates.notifyOnOrderPlaced,
      notifyOnDeadlineApproaching: updates.notifyOnDeadlineApproaching,
      notifyOnEventClosed: updates.notifyOnEventClosed,
      notifyOnPaymentConfirmed: updates.notifyOnPaymentConfirmed,
      notifyOnEventCompleted: updates.notifyOnEventCompleted,
    };

    Object.keys(normalized).forEach((key) => {
      if (normalized[key] === undefined) {
        delete normalized[key];
      }
    });

    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      update: normalized,
      create: {
        userId,
        ...normalized,
      },
    });

    res.json({
      data: {
        ...settings,
        emailNotifications: settings.emailEnabled,
        inAppNotifications: settings.inAppEnabled,
      },
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: 'Failed to update notification settings' });
  }
};
