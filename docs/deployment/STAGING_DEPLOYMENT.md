# LunchSync - Staging Deployment Guide

## Recommended Options (Easiest to Hardest)

### 🥇 Option 1: Railway.app (RECOMMENDED - Easiest)

**Why Railway:**
- ✅ One-click multi-service deployment
- ✅ Built-in PostgreSQL & Redis (no config needed)
- ✅ Auto-deploys from GitHub on push
- ✅ Free $5/month credit (enough for staging)
- ✅ Environment variables GUI
- ✅ Automatic HTTPS

**Setup Time:** ~10 minutes

#### Steps:

1. **Prepare Production Dockerfiles**
   - Railway will use our Dockerfiles (create production versions below)

2. **Deploy to Railway**
   ```bash
   # Install Railway CLI (optional)
   npm i -g @railway/cli
   railway login
   
   # OR use Railway Dashboard (easier)
   # Go to https://railway.app
   ```

3. **Create New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `lunch.app` repository
   - Railway auto-detects services

4. **Add Services**
   - **PostgreSQL**: Click "+ New" → "Database" → "PostgreSQL"
   - **Redis**: Click "+ New" → "Database" → "Redis"
   - **Backend**: Auto-detected from `/backend`
   - **Frontend**: Auto-detected from `/frontend`

5. **Configure Environment Variables**
   
   **Backend Service:**
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-populated
   REDIS_URL=${{Redis.REDIS_URL}}           # Auto-populated
   JWT_SECRET=<generate-random-secret>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
   NOTIFICATIONS_REDIS_URL=${{Redis.REDIS_URL}}
   NOTIFICATIONS_REDIS_TLS=true
   ```

   **Frontend Service:**
   ```env
   NODE_ENV=production
   VITE_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
   ```

6. **Deploy**
   - Railway auto-deploys on every push to `main`
   - Monitor logs in Railway dashboard

**URLs:**
- Frontend: `https://your-app.up.railway.app`
- Backend: `https://your-api.up.railway.app`

---

### 🥈 Option 2: Render.com (Easy, More Control)

**Why Render:**
- ✅ Good free tier (750 hours/month)
- ✅ Built-in PostgreSQL & Redis
- ✅ Blueprint YAML for infrastructure as code
- ✅ Auto-deploys from GitHub
- ✅ Better monitoring than Railway

**Setup Time:** ~15 minutes

#### Steps:

1. **Create `render.yaml` Blueprint** (see below)

2. **Deploy to Render**
   - Go to https://render.com
   - Click "New" → "Blueprint"
   - Connect GitHub repo
   - Select `render.yaml`

3. **Render Creates:**
   - PostgreSQL database
   - Redis instance
   - Backend web service
   - Frontend static site

**Note:** Free tier has limitations:
- Services spin down after 15 min inactivity
- Cold starts take ~30 seconds
- Fine for staging, not production

---

### 🥉 Option 3: DigitalOcean App Platform (Balanced)

**Why DigitalOcean:**
- ✅ $5/month for basic apps
- ✅ Managed databases
- ✅ Good performance
- ✅ App spec YAML

**Setup Time:** ~20 minutes

---

### Option 4: AWS / GCP / Azure (Most Complex)

**Not recommended for quick staging** - requires:
- VPC setup, security groups, load balancers
- Container registry (ECR/GCR)
- Kubernetes or ECS/Cloud Run
- Manual database provisioning

---

## Production Dockerfiles (Required for Deployment)

### Backend Production Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl openssl-dev

# Copy built artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 5000

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Frontend Production Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build app (uses VITE_API_URL from env)
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Frontend Nginx Config

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Railway Blueprint (render.yaml equivalent)

Railway doesn't use YAML, but here's the Render blueprint for reference:

### render.yaml

Create in project root:

```yaml
services:
  # Backend API
  - type: web
    name: lunchsync-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    region: oregon
    plan: starter
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: DATABASE_URL
        fromDatabase:
          name: lunchsync-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: lunchsync-redis
          type: redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: FRONTEND_URL
        fromService:
          name: lunchsync-frontend
          type: web
          property: url
      - key: NOTIFICATIONS_REDIS_URL
        fromService:
          name: lunchsync-redis
          type: redis
          property: connectionString
      - key: NOTIFICATIONS_REDIS_TLS
        value: true
    healthCheckPath: /health

  # Frontend Static Site
  - type: web
    name: lunchsync-frontend
    runtime: docker
    dockerfilePath: ./frontend/Dockerfile
    region: oregon
    plan: starter
    envVars:
      - key: VITE_API_URL
        value: https://lunchsync-backend.onrender.com/api
    buildCommand: npm run build
    staticPublishPath: ./dist

databases:
  # PostgreSQL
  - name: lunchsync-db
    plan: starter
    databaseName: lunchsync
    user: lunchsync
    region: oregon

  # Redis
  - name: lunchsync-redis
    plan: starter
    region: oregon
    ipAllowList: []
```

---

## Environment Variables Reference

### Backend Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5000` | Server port |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | `random-string` | JWT signing key |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `FRONTEND_URL` | `https://app.example.com` | CORS origin |
| `NOTIFICATIONS_REDIS_URL` | `redis://...` | Redis connection string |
| `NOTIFICATIONS_REDIS_TLS` | `true` | Enable TLS for Redis |

### Frontend Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `https://api.example.com/api` | Backend API endpoint |

---

## Deployment Checklist

### Pre-Deployment
- [ ] Create production Dockerfiles (backend/Dockerfile, frontend/Dockerfile)
- [ ] Create frontend/nginx.conf
- [ ] Update package.json build scripts
- [ ] Test Docker builds locally
- [ ] Generate strong JWT_SECRET

### Railway Deployment
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Add PostgreSQL database
- [ ] Add Redis instance
- [ ] Configure backend environment variables
- [ ] Configure frontend environment variables
- [ ] Verify auto-deploy on push

### Post-Deployment
- [ ] Run database migrations
- [ ] Seed initial data (optional)
- [ ] Test frontend → backend connection
- [ ] Test WebSocket/realtime features
- [ ] Verify authentication flow
- [ ] Check CORS settings

---

## Testing Deployment

```bash
# Test backend health
curl https://your-backend.railway.app/health

# Test frontend loads
curl -I https://your-frontend.railway.app

# Test API endpoint
curl https://your-backend.railway.app/api/auth/health
```

---

## Monitoring & Logs

### Railway
- Dashboard → Service → Logs tab
- Click "Metrics" for resource usage
- Set up deployment webhooks for notifications

### Render
- Dashboard → Service → Logs
- Metrics tab for CPU/memory
- Email alerts for failures

---

## Rollback Strategy

### Railway
```bash
# Via CLI
railway rollback

# OR via Dashboard
# Deployments → Select previous → Rollback
```

### Render
- Dashboard → Deployments → Select previous → Restore

---

## Cost Estimates (Monthly)

### Railway (Recommended for Staging)
- Free: $5 credit/month
- Hobby: $5/service (pay for what you use)
- **Estimated staging cost: $0-10/month**

### Render
- Free tier: $0 (with limitations)
- Starter: $7/service
- **Estimated staging cost: $0 (free tier) or $21/month**

### DigitalOcean
- Basic: $5/month
- Pro: $12/month
- **Estimated staging cost: $12-20/month**

---

## Next Steps

1. **Choose Platform:** Railway recommended for easiest setup
2. **Create Production Dockerfiles:** Use templates above
3. **Test Locally:** `docker build` each service
4. **Deploy:** Follow platform-specific steps
5. **Monitor:** Check logs, test endpoints
6. **Automate:** Set up CI/CD with GitHub Actions (optional)

---

## Troubleshooting

### Common Issues

**Build Fails:**
- Check Dockerfile paths are correct
- Verify all dependencies in package.json
- Check build logs for specific errors

**Database Connection Fails:**
- Verify DATABASE_URL format
- Check database service is running
- Test connection with `psql` command

**Frontend Can't Reach Backend:**
- Verify VITE_API_URL includes `/api`
- Check CORS settings (FRONTEND_URL)
- Test backend health endpoint directly

**WebSocket/Realtime Not Working:**
- Verify NOTIFICATIONS_REDIS_URL is set
- Check Redis connection
- Ensure TLS setting matches Redis config

---

## Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Nginx Configuration](https://nginx.org/en/docs/)
