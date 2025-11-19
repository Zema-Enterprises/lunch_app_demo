# LunchSync - Staging Deployment Guide

## Recommended Options (Easiest to Hardest)

### 🥇 Option 1: Render (Backend + DB + Redis) + Vercel (Frontend) — **Recommended**

This mirrors our live staging stack:

- Render hosts the **Node/Express API**, **PostgreSQL**, and **Redis**
- Vercel serves the **Vite frontend** from the global Edge network
- GitHub → Render/Vercel auto‑deploy keeps both halves in sync

**Setup Time:** ~15 minutes

#### 1. Deploy backend + databases on Render

1. **Create resources**
   - Log into [Render](https://dashboard.render.com)
   - Click **New → PostgreSQL** → name it `lunchsync-db` (free tier is fine)
   - Click **New → Redis** → name it `lunchsync-redis`
   - Click **New → Web Service**
     - Repo: `Zema-Enterprises/lunch_app_demo`
     - Root dir: `backend`
     - Runtime: Node 20 (Render default)
     - Build command: `npm ci && npm run build`
     - Start command: `npm run db:migrate && npm run db:seed && npm run start`

2. **Environment variables (Backend web service)**
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=<<Render Postgres Internal URL>>
   JWT_SECRET=<<generate secure secret>>
   JWT_EXPIRES_IN=7d
   REDIS_URL=<<Render Redis connection string>>
   NOTIFICATIONS_REDIS_URL=<<same as REDIS_URL>>
   NOTIFICATIONS_REDIS_TLS=true
   FRONTEND_URL=https://frontend-<project>.vercel.app
   ```
   Tips:
   - Use the “Add from service” buttons in Render to link the Postgres/Redis URLs.
   - `FRONTEND_URL` accepts a comma separated list; include your production Vercel domain and any preview hostnames if needed.

3. **Run migrations once**
   - Render executes `npm run db:migrate && npm run db:seed` at every deploy. The seed script is idempotent and will skip if demo data already exists.

4. **Verify**
   - After the service goes green, hit `https://<render-backend>.onrender.com/health`.
   - API routes live under `/api/...` (e.g., `/api/auth/login`).

#### 2. Deploy frontend on Vercel

1. **Import repo**
   - Go to [Vercel](https://vercel.com/new) → import the GitHub repo.
   - Set **Root Directory** to `frontend`.
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Environment variables**
   - Add `VITE_API_URL=https://<render-backend>.onrender.com/api` for both `Production` and `Preview`.
   - Important: include `/api` so the client hits the correct Express routes.

3. **Deploy**
   - Run `vercel --prod` from `frontend/` or use the dashboard deploy button.
   - Once live, update the backend `FRONTEND_URL` (if not already done) with the final Vercel domain so CORS allows it.

4. **Smoke test**
   - Visit the Vercel URL, log in with the seeded credentials (`admin@demo.com` / `password123`), and confirm API calls resolve to Render.

#### 3. Optional automation

- Enable auto-deploys from the `main` branch on both Render and Vercel.
- Use `render deploys create ...` after merging to force a redeploy if needed.

---

### 🥈 Option 2: Railway.app (Alternative)

Railway can still run the entire stack inside one project (backend + DB + Redis + frontend).

- Follow the previous Option 1 instructions if you prefer Railway’s UX.
- Remember to set `FRONTEND_URL` to the Railway frontend domain and `VITE_API_URL` to the Railway backend domain with `/api`.

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
