"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
exports.createEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().max(1000).optional(),
        deliveryLocation: zod_1.z.string().min(1).max(200).optional(),
        orderDeadline: zod_1.z.string().datetime(),
        paymentMethod: zod_1.z.enum(['EVENT_CREATOR', 'INDIVIDUAL', 'COMPANY_EXPENSE']).optional(),
        restaurantId: zod_1.z.string().min(1),
    }),
});
exports.updateEventSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().max(1000).optional(),
        deliveryLocation: zod_1.z.string().min(1).max(200).optional(),
        orderDeadline: zod_1.z.string().datetime().optional(),
        paymentMethod: zod_1.z.enum(['EVENT_CREATOR', 'INDIVIDUAL', 'COMPANY_EXPENSE']).optional(),
        status: zod_1.z.enum(['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED']).optional(),
    }),
});
