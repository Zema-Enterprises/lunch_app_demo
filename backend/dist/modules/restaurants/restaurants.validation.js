"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMenuItemSchema = exports.createMenuItemSchema = exports.updateRestaurantSchema = exports.createRestaurantSchema = void 0;
const zod_1 = require("zod");
exports.createRestaurantSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100),
        cuisine: zod_1.z.string().min(1).max(50),
        openTime: zod_1.z.string().min(1).max(20),
        closeTime: zod_1.z.string().min(1).max(20),
        deliveryTime: zod_1.z.string().min(1).max(50),
        hasMenu: zod_1.z.boolean(),
        imageUrl: zod_1.z.string().max(500).optional(),
    }),
});
exports.updateRestaurantSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        cuisine: zod_1.z.string().min(1).max(50).optional(),
        openTime: zod_1.z.string().min(1).max(20).optional(),
        closeTime: zod_1.z.string().min(1).max(20).optional(),
        deliveryTime: zod_1.z.string().min(1).max(50).optional(),
        hasMenu: zod_1.z.boolean().optional(),
        imageUrl: zod_1.z.string().max(500).optional(),
    }),
});
exports.createMenuItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().max(500).optional(),
        price: zod_1.z.number().positive(),
        category: zod_1.z.string().min(1).max(50),
        available: zod_1.z.boolean().optional(),
    }),
});
exports.updateMenuItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().max(500).optional(),
        price: zod_1.z.number().positive().optional(),
        category: zod_1.z.string().min(1).max(50).optional(),
        available: zod_1.z.boolean().optional(),
    }),
});
