"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const error_1 = require("./middleware/error");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const restaurants_routes_1 = __importDefault(require("./modules/restaurants/restaurants.routes"));
const events_routes_1 = __importDefault(require("./modules/events/events.routes"));
const orders_routes_1 = __importDefault(require("./modules/orders/orders.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const notifications_routes_1 = __importDefault(require("./modules/notifications/notifications.routes"));
const env_1 = require("./config/env");
const app = (0, express_1.default)();
// Security middleware - should be first
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS - tighten for production
const corsOptions = {
    origin: env_1.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'http://localhost:3001'
        : ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' })); // Add size limit
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging
app.use((0, morgan_1.default)('dev'));
// Apply rate limiting only in non-test environments
if (env_1.env.NODE_ENV !== 'test') {
    app.use('/api/', limiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
}
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/restaurants', restaurants_routes_1.default);
app.use('/api/events', events_routes_1.default);
app.use('/api/events', orders_routes_1.default); // Event-specific order routes (/:eventId/orders)
app.use('/api/orders', orders_routes_1.default); // User order routes (/me)
app.use('/api/users', users_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
// Error handling (must be last)
app.use(error_1.errorHandler);
exports.default = app;
