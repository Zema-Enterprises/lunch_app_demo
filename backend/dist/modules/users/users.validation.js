"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanySchema = exports.changePasswordSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
        email: zod_1.z.string().email('Invalid email address'),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    }),
});
exports.updateCompanySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Company name must be at least 2 characters'),
        domain: zod_1.z.string().min(2, 'Domain must be at least 2 characters'),
    }),
});
