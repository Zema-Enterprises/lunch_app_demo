"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const restaurants_controller_1 = require("./restaurants.controller");
const validation_1 = require("../../middleware/validation");
const restaurants_validation_1 = require("./restaurants.validation");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Restaurant routes
router.get('/', restaurants_controller_1.getRestaurants);
router.get('/:id', restaurants_controller_1.getRestaurant);
router.post('/', auth_1.adminMiddleware, (0, validation_1.validate)(restaurants_validation_1.createRestaurantSchema), restaurants_controller_1.createRestaurant);
router.patch('/:id', auth_1.adminMiddleware, (0, validation_1.validate)(restaurants_validation_1.updateRestaurantSchema), restaurants_controller_1.updateRestaurant);
router.delete('/:id', auth_1.adminMiddleware, restaurants_controller_1.deleteRestaurant);
// Menu item routes
router.get('/:id/menu', restaurants_controller_1.getMenuItems);
router.post('/:id/menu-items', auth_1.adminMiddleware, (0, validation_1.validate)(restaurants_validation_1.createMenuItemSchema), restaurants_controller_1.createMenuItem);
router.patch('/:id/menu-items/:itemId', auth_1.adminMiddleware, (0, validation_1.validate)(restaurants_validation_1.updateMenuItemSchema), restaurants_controller_1.updateMenuItem);
router.delete('/:id/menu-items/:itemId', auth_1.adminMiddleware, restaurants_controller_1.deleteMenuItem);
exports.default = router;
