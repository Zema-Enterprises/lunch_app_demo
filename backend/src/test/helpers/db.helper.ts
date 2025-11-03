/**
 * Database helper utilities for tests
 * Provides functions for database operations and cleanup
 */

import prisma from '../../config/database';

/**
 * Clean up all test data for a company
 * Use this in afterEach or afterAll to ensure clean state
 */
export async function cleanupTestData(companyId: string) {
  if (!companyId) return;

  try {
    // Delete in correct order due to foreign key constraints
    await prisma.notificationDeliveryReceipt.deleteMany({
      where: {
        companyId,
      },
    });

    await prisma.pushSubscription.deleteMany({
      where: {
        companyId,
      },
    });
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          event: {
            companyId,
          },
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        event: {
          companyId,
        },
      },
    });

    await prisma.eventParticipant.deleteMany({
      where: {
        event: {
          companyId,
        },
      },
    });

    await prisma.event.deleteMany({
      where: {
        companyId,
      },
    });

    await prisma.menuItem.deleteMany({
      where: {
        restaurant: {
          companyId,
        },
      },
    });

    await prisma.restaurant.deleteMany({
      where: {
        companyId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        companyId,
      },
    });

    await prisma.company.delete({
      where: {
        id: companyId,
      },
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
}

/**
 * Clean up specific user and their related data
 */
export async function cleanupUser(userId: string) {
  if (!userId) return;

  await prisma.orderItem.deleteMany({
    where: {
      order: {
        userId,
      },
    },
  });

  await prisma.order.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.eventParticipant.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.event.deleteMany({
    where: {
      createdById: userId,
    },
  });

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });
}

/**
 * Clean up specific event and its related data
 */
export async function cleanupEvent(eventId: string) {
  if (!eventId) return;

  await prisma.orderItem.deleteMany({
    where: {
      order: {
        eventId,
      },
    },
  });

  await prisma.order.deleteMany({
    where: {
      eventId,
    },
  });

  await prisma.eventParticipant.deleteMany({
    where: {
      eventId,
    },
  });

  await prisma.event.delete({
    where: {
      id: eventId,
    },
  });
}

/**
 * Reset auto-increment sequences (if needed)
 */
export async function resetSequences() {
  // PostgreSQL doesn't use auto-increment with cuid
  // But this could be useful for other scenarios
}

/**
 * Get database connection stats for debugging
 */
export async function getDatabaseStats() {
  const companies = await prisma.company.count();
  const users = await prisma.user.count();
  const events = await prisma.event.count();
  const orders = await prisma.order.count();
  const restaurants = await prisma.restaurant.count();

  return {
    companies,
    users,
    events,
    orders,
    restaurants,
  };
}

/**
 * Verify database is accessible
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}
