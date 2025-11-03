"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_controller_1 = require("./orders.controller");
const validation_1 = require("../../middleware/validation");
const orders_validation_1 = require("./orders.validation");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// User's orders
router.get('/me', orders_controller_1.getUserOrders);
// Event-specific orders
router.get('/:eventId/orders', orders_controller_1.getEventOrders);
router.post('/:eventId/orders', (0, validation_1.validate)(orders_validation_1.createOrderSchema), orders_controller_1.createOrUpdateOrder);
router.delete('/:eventId/orders/:id', orders_controller_1.deleteOrder);
router.patch('/:eventId/orders/:id/payment', orders_controller_1.confirmPayment);
exports.default = router;
