"use strict";
/**
 * Database helper utilities for tests
 * Provides functions for database operations and cleanup
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTestData = cleanupTestData;
exports.cleanupUser = cleanupUser;
exports.cleanupEvent = cleanupEvent;
exports.resetSequences = resetSequences;
exports.getDatabaseStats = getDatabaseStats;
exports.isDatabaseConnected = isDatabaseConnected;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Clean up all test data for a company
 * Use this in afterEach or afterAll to ensure clean state
 */
async function cleanupTestData(companyId) {
    if (!companyId)
        return;
    try {
        // Delete in correct order due to foreign key constraints
        await database_1.default.orderItem.deleteMany({
            where: {
                order: {
                    event: {
                        companyId,
                    },
                },
            },
        });
        await database_1.default.order.deleteMany({
            where: {
                event: {
                    companyId,
                },
            },
        });
        await database_1.default.eventParticipant.deleteMany({
            where: {
                event: {
                    companyId,
                },
            },
        });
        await database_1.default.event.deleteMany({
            where: {
                companyId,
            },
        });
        await database_1.default.menuItem.deleteMany({
            where: {
                restaurant: {
                    companyId,
                },
            },
        });
        await database_1.default.restaurant.deleteMany({
            where: {
                companyId,
            },
        });
        await database_1.default.user.deleteMany({
            where: {
                companyId,
            },
        });
        await database_1.default.company.delete({
            where: {
                id: companyId,
            },
        });
    }
    catch (error) {
        console.error('Error cleaning up test data:', error);
        throw error;
    }
}
/**
 * Clean up specific user and their related data
 */
async function cleanupUser(userId) {
    if (!userId)
        return;
    await database_1.default.orderItem.deleteMany({
        where: {
            order: {
                userId,
            },
        },
    });
    await database_1.default.order.deleteMany({
        where: {
            userId,
        },
    });
    await database_1.default.eventParticipant.deleteMany({
        where: {
            userId,
        },
    });
    await database_1.default.event.deleteMany({
        where: {
            createdById: userId,
        },
    });
    await database_1.default.user.delete({
        where: {
            id: userId,
        },
    });
}
/**
 * Clean up specific event and its related data
 */
async function cleanupEvent(eventId) {
    if (!eventId)
        return;
    await database_1.default.orderItem.deleteMany({
        where: {
            order: {
                eventId,
            },
        },
    });
    await database_1.default.order.deleteMany({
        where: {
            eventId,
        },
    });
    await database_1.default.eventParticipant.deleteMany({
        where: {
            eventId,
        },
    });
    await database_1.default.event.delete({
        where: {
            id: eventId,
        },
    });
}
/**
 * Reset auto-increment sequences (if needed)
 */
async function resetSequences() {
    // PostgreSQL doesn't use auto-increment with cuid
    // But this could be useful for other scenarios
}
/**
 * Get database connection stats for debugging
 */
async function getDatabaseStats() {
    const companies = await database_1.default.company.count();
    const users = await database_1.default.user.count();
    const events = await database_1.default.event.count();
    const orders = await database_1.default.order.count();
    const restaurants = await database_1.default.restaurant.count();
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
async function isDatabaseConnected() {
    try {
        await database_1.default.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        return false;
    }
}
