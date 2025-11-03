"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRedisConfig = exports.DEFAULT_REDIS_URL = void 0;
exports.DEFAULT_REDIS_URL = 'redis://localhost:6379';
const buildRedisConfig = (env = process.env) => {
    const url = env.NOTIFICATIONS_REDIS_URL ?? env.REDIS_URL ?? exports.DEFAULT_REDIS_URL;
    const tls = env.NOTIFICATIONS_REDIS_TLS === 'true';
    return { url, tls: tls || undefined };
};
exports.buildRedisConfig = buildRedisConfig;
