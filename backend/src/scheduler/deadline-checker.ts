import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { createNotificationEvents } from '../modules/notifications/notification.service';

const prisma = new PrismaClient();

const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Find OPEN events whose orderDeadline has passed and auto-close them.
 */
async function closeExpiredEvents() {
  try {
    const now = new Date();

    const expiredEvents = await prisma.event.findMany({
      where: {
        status: 'OPEN',
        orderDeadline: { lte: now },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true } },
          },
        },
        restaurant: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    for (const event of expiredEvents) {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'CLOSED' },
      });

      const participantIds = event.participants.map((p) => p.user.id);
      await createNotificationEvents('EVENT_CLOSED', participantIds, {
        eventId: event.id,
        actorId: event.createdById,
        context: { event },
      });

      logger.info(`Auto-closed event "${event.title}" (${event.id}) — deadline passed`);
    }
  } catch (error) {
    logger.error('Deadline checker error', { error });
  }
}

export function startDeadlineChecker() {
  logger.info(`Deadline checker started (interval: ${CHECK_INTERVAL_MS / 1000}s)`);
  // Run immediately on start, then on interval
  closeExpiredEvents();
  intervalId = setInterval(closeExpiredEvents, CHECK_INTERVAL_MS);
}

export function stopDeadlineChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Deadline checker stopped');
  }
}
