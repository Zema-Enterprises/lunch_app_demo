import express from 'express';
import cors, { CorsOptions } from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error';
import authRoutes from './modules/auth/auth.routes';
import restaurantRoutes from './modules/restaurants/restaurants.routes';
import eventRoutes from './modules/events/events.routes';
import orderRoutes from './modules/orders/orders.routes';
import userRoutes from './modules/users/users.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import inviteRoutes from './modules/invites/invites.routes';
import { env } from './config/env';

const app = express();

// When running behind a proxy (e.g., Render/NGINX), trust the forwarded headers
app.set('trust proxy', env.TRUST_PROXY);

// Security middleware - should be first
app.use(helmet({
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

type OriginRule = string | RegExp;

const parseOrigins = (origins?: string) =>
  origins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const productionOriginRules: OriginRule[] = [
  ...(parseOrigins(process.env.FRONTEND_URL) || ['http://localhost:3001']),
  /^https:\/\/frontend-[a-z0-9-]+\.vercel\.app$/i,
];

const developmentOrigins = ['http://localhost:3001', 'http://localhost:3000'];

const allowedOrigins: OriginRule[] =
  env.NODE_ENV === 'production' ? productionOriginRules : developmentOrigins;

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true; // allow same-origin / server-to-server calls
  return allowedOrigins.some((rule) =>
    rule instanceof RegExp ? rule.test(origin) : rule === origin
  );
};

// CORS - allow configured frontend hosts and Vercel staging
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Add size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Apply rate limiting only in non-test environments
if (env.NODE_ENV !== 'test') {
  app.use('/api/', limiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', orderRoutes); // Event-specific order routes (/:eventId/orders)
app.use('/api/orders', orderRoutes); // User order routes (/me)
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/invites', inviteRoutes);

// Error handling (must be last)
app.use(errorHandler);

export default app;
