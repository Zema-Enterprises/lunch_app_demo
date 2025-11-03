"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const redis_config_1 = require("../../realtime/redis-config");
(0, globals_1.describe)('buildRedisConfig', () => {
    (0, globals_1.it)('uses explicit notifications redis url when provided', () => {
        const config = (0, redis_config_1.buildRedisConfig)({ NOTIFICATIONS_REDIS_URL: 'redis://cache.example.com:6380' });
        (0, globals_1.expect)(config).toEqual({ url: 'redis://cache.example.com:6380' });
    });
    (0, globals_1.it)('falls back to REDIS_URL', () => {
        const config = (0, redis_config_1.buildRedisConfig)({ REDIS_URL: 'redis://shared.cache:6379' });
        (0, globals_1.expect)(config).toEqual({ url: 'redis://shared.cache:6379' });
    });
    (0, globals_1.it)('falls back to default and handles TLS flag', () => {
        const config = (0, redis_config_1.buildRedisConfig)({ NOTIFICATIONS_REDIS_TLS: 'true' });
        (0, globals_1.expect)(config).toEqual({ url: redis_config_1.DEFAULT_REDIS_URL, tls: true });
    });
});
