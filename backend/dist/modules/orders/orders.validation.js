"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        customOrder: zod_1.z.string().optional(),
        totalAmount: zod_1.z.number().positive().optional(),
        paymentConfirmed: zod_1.z.boolean().optional(),
        orderItems: zod_1.z.array(zod_1.z.object({
            menuItemId: zod_1.z.string(),
            quantity: zod_1.z.number().int().positive(),
            price: zod_1.z.number().positive(),
        })).optional(),
    }),
});
exports.updateOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        customOrder: zod_1.z.string().optional(),
        totalAmount: zod_1.z.number().positive().optional(),
        paymentConfirmed: zod_1.z.boolean().optional(),
        orderItems: zod_1.z.array(zod_1.z.object({
            menuItemId: zod_1.z.string(),
            quantity: zod_1.z.number().int().positive(),
            price: zod_1.z.number().positive(),
        })).optional(),
    }),
});
