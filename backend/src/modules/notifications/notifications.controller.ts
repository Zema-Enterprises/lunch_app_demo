import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';

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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    res.json({ data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
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
    res.status(500).json({ error: 'Failed to fetch notification stats' });
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
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notificationEvent.update({
      where: { id },
      data: { read: true },
    });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
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
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
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
          emailEnabled: true,
          inAppEnabled: true,
          notifyOnEventCreated: false,
          notifyOnOrderPlaced: true,
          notifyOnDeadlineApproaching: true,
          notifyOnEventClosed: true,
          notifyOnPaymentConfirmed: true,
          notifyOnEventCompleted: true,
        },
      });
    }

    res.json({ data: settings });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
};

/**
 * Update user notification settings
 */
export const updateNotificationSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updates = req.body as any;

    // Remove protected fields from updates
    delete updates.userId;
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    res.json({ data: settings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
};
