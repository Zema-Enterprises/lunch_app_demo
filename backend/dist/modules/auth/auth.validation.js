"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email().max(255),
        password: zod_1.z.string().min(6).max(100),
        name: zod_1.z.string().min(1).max(100),
        companyId: zod_1.z.string().optional(),
        role: zod_1.z.enum(['ADMIN', 'USER']).optional(),
        companyName: zod_1.z.string().min(1).max(100).optional(),
        companyDomain: zod_1.z.string().min(1).max(100).optional(),
        companySlug: zod_1.z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email().max(255),
        password: zod_1.z.string().max(100),
    }),
});
