"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotificationSettings = exports.getNotificationSettings = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotificationStats = exports.getNotifications = void 0;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Get all notifications for the authenticated user
 * Query params: unreadOnly (optional), limit (optional)
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const unreadOnly = req.query.unreadOnly === 'true';
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const where = {
            userId,
        };
        if (unreadOnly) {
            where.read = false;
        }
        const notifications = await database_1.default.notificationEvent.findMany({
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
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};
exports.getNotifications = getNotifications;
/**
 * Get notification statistics (unread count, total count)
 */
const getNotificationStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [unread, total] = await Promise.all([
            database_1.default.notificationEvent.count({
                where: {
                    userId,
                    read: false,
                },
            }),
            database_1.default.notificationEvent.count({
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
    }
    catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({ error: 'Failed to fetch notification stats' });
    }
};
exports.getNotificationStats = getNotificationStats;
/**
 * Mark a single notification as read
 */
const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        // Verify notification belongs to user
        const notification = await database_1.default.notificationEvent.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        await database_1.default.notificationEvent.update({
            where: { id },
            data: { read: true },
        });
        res.json({ data: { success: true } });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
/**
 * Mark all notifications as read for the authenticated user
 */
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        await database_1.default.notificationEvent.updateMany({
            where: {
                userId,
                read: false,
            },
            data: {
                read: true,
            },
        });
        res.json({ data: { success: true } });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
/**
 * Get user notification settings
 */
const getNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        let settings = await database_1.default.userNotificationSettings.findUnique({
            where: { userId },
        });
        // Create default settings if they don't exist
        if (!settings) {
            settings = await database_1.default.userNotificationSettings.create({
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
    }
    catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
};
exports.getNotificationSettings = getNotificationSettings;
/**
 * Update user notification settings
 */
const updateNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updates = req.body;
        // Remove protected fields from updates
        delete updates.userId;
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;
        const settings = await database_1.default.userNotificationSettings.upsert({
            where: { userId },
            update: updates,
            create: {
                userId,
                ...updates,
            },
        });
        res.json({ data: settings });
    }
    catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ error: 'Failed to update notification settings' });
    }
};
exports.updateNotificationSettings = updateNotificationSettings;
