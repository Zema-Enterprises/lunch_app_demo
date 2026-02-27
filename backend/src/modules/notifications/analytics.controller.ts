import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

export const getNotificationAnalyticsSummary = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const companyId = req.user.companyId;

    const [
      deliveryBreakdown,
      notificationTotals,
      unreadCounts,
    ] = await Promise.all([
      prisma.notificationDeliveryReceipt.groupBy({
        by: ['channel', 'status'],
        _count: { _all: true },
        where: { companyId },
      }),
      prisma.notificationEvent.count({
        where: { user: { companyId } },
      }),
      prisma.notificationEvent.count({
        where: { user: { companyId }, read: false },
      }),
    ]);

    const delivery = deliveryBreakdown.reduce<Record<string, Record<string, number>>>(
      (acc, row) => {
        acc[row.channel] = acc[row.channel] || {};
        acc[row.channel][row.status] = row._count._all;
        return acc;
      },
      {}
    );

    return res.json({
      data: {
        companyId,
        totals: {
          notifications: notificationTotals,
          unread: unreadCounts,
        },
        delivery,
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics summary:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
};
