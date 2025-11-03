"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const notifications_controller_1 = require("./notifications.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Notification endpoints
router.get('/', notifications_controller_1.getNotifications);
router.get('/stats', notifications_controller_1.getNotificationStats);
router.patch('/:id/read', notifications_controller_1.markNotificationAsRead);
router.post('/mark-all-read', notifications_controller_1.markAllNotificationsAsRead);
// Notification settings endpoints
router.get('/settings', notifications_controller_1.getNotificationSettings);
router.put('/settings', notifications_controller_1.updateNotificationSettings);
exports.default = router;
