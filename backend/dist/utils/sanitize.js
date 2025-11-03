"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeObject = exports.sanitize = void 0;
/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
const sanitize = (input) => {
    if (!input || typeof input !== 'string') {
        return input;
    }
    // Remove HTML tags and escape special characters
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
        .trim();
};
exports.sanitize = sanitize;
/**
 * Sanitize an object's string values
 */
const sanitizeObject = (obj) => {
    const sanitized = { ...obj };
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = (0, exports.sanitize)(sanitized[key]);
        }
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
            sanitized[key] = (0, exports.sanitizeObject)(sanitized[key]);
        }
    }
    return sanitized;
};
exports.sanitizeObject = sanitizeObject;
