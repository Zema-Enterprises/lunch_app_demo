# LunchSync - Deployment Guide

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ database (or Docker)
- npm or yarn package manager

## Environment Setup

### Backend Environment Variables

Create `/backend/.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/lunchsync?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=5000
NODE_ENV=production
```

### Frontend Environment Variables

Create `/frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

For production, update to your production API URL:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## Database Setup

### Option 1: Using Docker (Recommended)

1. Start PostgreSQL container:
```bash
cd /path/to/lunch.app
docker-compose up -d
```

2. Run migrations:
```bash
cd backend
npm run db:migrate
```

3. Seed the database (optional):
```bash
npm run db:seed
```

### Option 2: Using Local PostgreSQL

1. Create database:
```sql
CREATE DATABASE lunchsync;
```

2. Update `DATABASE_URL` in `.env` to point to your local PostgreSQL instance

3. Run migrations:
```bash
cd backend
npm run db:migrate
npm run db:seed
```

## Installation

### Backend

```bash
cd backend
npm install
npm run build
```

### Frontend

```bash
cd frontend
npm install
npm run build
```

## Running the Application

### Development Mode

1. Start backend:
```bash
cd backend
npm run dev
```

2. Start frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:3000
Backend API will be available at: http://localhost:5000

### Production Mode

1. Build backend:
```bash
cd backend
npm run build
```

2. Build frontend:
```bash
cd frontend
npm run build
```

3. Start backend:
```bash
cd backend
npm start
```

4. Serve frontend build:
```bash
# Using a static file server like serve
npx serve -s frontend/dist -p 3000
```

## Deployment Options

### Option 1: Deploy to Vercel (Frontend) + Railway (Backend)

#### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `frontend`
4. Add environment variable:
   - `VITE_API_URL`: Your Railway backend URL

#### Backend (Railway)

1. Connect repository to Railway
2. Set root directory to `backend`
3. Add environment variables:
   - `DATABASE_URL`: (Railway will provide PostgreSQL)
   - `JWT_SECRET`: Generate a secure secret
   - `PORT`: 5000
   - `NODE_ENV`: production
4. Deploy

### Option 2: Deploy to Heroku

#### Backend

```bash
cd backend
heroku create your-app-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set JWT_SECRET=your-secret-key
heroku config:set NODE_ENV=production
git push heroku main
heroku run npm run db:migrate
```

#### Frontend

```bash
cd frontend
# Update VITE_API_URL to Heroku backend URL
npm run build
# Deploy dist folder to static hosting (Netlify, Vercel, etc.)
```

### Option 3: VPS Deployment (DigitalOcean, AWS EC2, etc.)

1. SSH into your server
2. Install Node.js, PostgreSQL, and nginx
3. Clone repository
4. Set up PostgreSQL database
5. Configure environment variables
6. Build and start backend
7. Build frontend and configure nginx to serve it
8. Set up PM2 for process management:

```bash
npm install -g pm2
cd backend
pm2 start npm --name "lunchsync-api" -- start
pm2 save
pm2 startup
```

## Database Migrations

To create a new migration:
```bash
cd backend
npx prisma migrate dev --name migration_name
```

To apply migrations in production:
```bash
cd backend
npm run db:migrate
```

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong, unique value
- [ ] Use HTTPS in production
- [ ] Set proper CORS origins (not *)
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Use environment-specific `.env` files
- [ ] Never commit `.env` files to version control
- [ ] Use strong passwords for database
- [ ] Enable database SSL in production

## Monitoring & Logging

### Recommended Tools

- **Backend Monitoring**: PM2, New Relic, DataDog
- **Frontend Monitoring**: Sentry, LogRocket
- **Database**: pgAdmin, DataGrip
- **Uptime Monitoring**: UptimeRobot, Pingdom

### PM2 Monitoring

```bash
pm2 monit
pm2 logs lunchsync-api
```

## Troubleshooting

### Database Connection Issues

1. Check DATABASE_URL format
2. Ensure PostgreSQL is running
3. Verify firewall/security group settings
4. Check database credentials

### Build Errors

1. Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Check Node.js version (must be 20+)

### CORS Errors

Update backend CORS configuration in `backend/src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
```

## Backup & Restore

### Backup Database

```bash
pg_dump -h localhost -p 5434 -U postgres lunchsync > backup.sql
```

### Restore Database

```bash
psql -h localhost -p 5434 -U postgres lunchsync < backup.sql
```

## Scaling Considerations

- Use a load balancer for multiple backend instances
- Implement Redis for session management
- Use CDN for frontend static assets
- Set up database read replicas
- Implement caching (Redis/Memcached)
- Use connection pooling for database

## Support

For issues and questions:
- Check PROGRESS.md for known limitations
- Review error logs in PM2 or server logs
- Check network connectivity and firewall rules
