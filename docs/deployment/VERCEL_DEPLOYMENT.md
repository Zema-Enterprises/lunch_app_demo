# Vercel Deployment Guide for LunchSync

## ⚠️ Important Considerations

### What Vercel is Great For:
- ✅ **Frontend (React/Vite)** - Excellent performance, CDN, automatic optimization
- ✅ Zero-config deployment
- ✅ Automatic HTTPS
- ✅ Preview deployments for PRs
- ✅ Great developer experience

### Vercel Limitations for Full-Stack Apps:
- ⚠️ **Backend as Serverless Functions** - Not ideal for our Express app
- ⚠️ **No persistent WebSocket connections** - Our real-time notifications need this
- ⚠️ **10-second timeout** on serverless functions
- ⚠️ **No built-in PostgreSQL or Redis** - Must use external services
- ⚠️ **Serverless architecture** - Requires app restructuring

---

## Recommended Approach: Hybrid Deployment

### Best Option: Vercel (Frontend) + Railway/Render (Backend)

**Why?**
- Frontend on Vercel = Blazing fast, global CDN, perfect for React
- Backend on Railway/Render = Persistent connections, WebSockets, databases included
- Best of both worlds

**Cost:** $0-15/month
**Setup Time:** 15-20 minutes

---

## Option 1: Hybrid (Vercel + Railway) - RECOMMENDED

### Frontend on Vercel

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Configure Frontend for Vercel

Create `frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 3. Deploy Frontend to Vercel

```bash
cd frontend
vercel login
vercel
```

Or use Vercel Dashboard:
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select `/frontend` as root directory
4. Set environment variable:
   - `VITE_API_URL` = `https://your-backend.up.railway.app/api`
5. Deploy

### Backend on Railway

Follow the Railway setup from `STAGING_DEPLOYMENT.md`:
1. Deploy backend to Railway
2. Add PostgreSQL & Redis
3. Configure environment variables
4. Copy backend URL

### Connect Them

1. **Update Frontend Environment on Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Set `VITE_API_URL` = `https://<railway-backend-url>/api`
   - Redeploy

2. **Update Backend CORS on Railway:**
   - Go to Railway Dashboard → Backend Service → Variables
   - Set `FRONTEND_URL` = `https://<vercel-frontend-url>`
   - Redeploy

**Done!** 
- Frontend: `https://your-app.vercel.app` (fast, global CDN)
- Backend: `https://your-api.up.railway.app` (persistent, WebSockets)

---

## Option 2: Frontend-Only on Vercel (Use External Backend)

If you deploy backend elsewhere (Railway, Render, AWS, etc.), Vercel is perfect for frontend.

### Quick Deploy

```bash
cd frontend

# Deploy with Vercel CLI
vercel --prod

# Set API URL
vercel env add VITE_API_URL production
# Enter: https://your-backend-api.com/api

# Redeploy
vercel --prod
```

---

## Option 3: Full-Stack on Vercel (NOT RECOMMENDED)

You *can* deploy the backend to Vercel, but requires significant restructuring:

### Challenges:
- ❌ Must convert Express routes to Vercel serverless functions
- ❌ No WebSocket support (need external WebSocket service)
- ❌ 10-second function timeout (not ideal for some operations)
- ❌ Cold starts on every request
- ❌ Must use external PostgreSQL (Vercel Postgres or external)
- ❌ Must use external Redis (Upstash Redis)

### If You Must Use Vercel for Backend:

#### 1. Restructure Backend

Create `backend/api/` directory and convert routes to functions:

**Example:** `backend/api/auth/login.ts`
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Your login logic here
    const { email, password } = req.body;
    // ... authentication logic
    
    return res.status(200).json({ data: { token, user } });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### 2. Configure Vercel

Create `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

#### 3. Use External Services

**PostgreSQL:** Vercel Postgres, Supabase, or Neon
```bash
# Add Vercel Postgres
vercel postgres create
```

**Redis:** Upstash Redis
```bash
# Add Upstash Redis via Vercel marketplace
vercel integration add upstash-redis
```

**WebSockets:** Use Ably, Pusher, or Socket.IO hosted service

#### 4. Deploy
```bash
cd backend
vercel --prod
```

**Why We Don't Recommend This:**
- Requires extensive refactoring (weeks of work)
- Loses Express middleware benefits
- WebSocket notifications need separate service ($)
- More complex to maintain
- Higher costs for backend on Vercel

---

## Cost Comparison

### Hybrid (Vercel + Railway)
- **Vercel Frontend:** Free (Hobby plan)
- **Railway Backend:** $5-10/month
- **Total:** $5-10/month
- **Benefits:** Best performance, full features, easy setup

### Full Vercel
- **Frontend:** Free
- **Serverless Functions:** Free (100GB-hrs/month)
- **Vercel Postgres:** $20/month (starts at)
- **Upstash Redis:** $10/month (starts at)
- **Ably/Pusher (WebSockets):** $10-25/month
- **Total:** $40-55/month
- **Drawbacks:** More expensive, complex setup, limitations

### Railway Only
- **All Services:** $5-15/month
- **Benefits:** Simple, all-in-one, easy to manage

---

## Performance Comparison

| Metric | Vercel Frontend + Railway Backend | Full Railway | Full Vercel |
|--------|----------------------------------|--------------|-------------|
| Frontend Load Time | ⭐⭐⭐⭐⭐ (Global CDN) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| API Response Time | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ (cold starts) |
| WebSocket Performance | ⭐⭐⭐⭐⭐ (Railway) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ (external service) |
| Database Queries | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ (serverless) |
| Setup Complexity | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## Quick Deploy: Hybrid Approach

### Step-by-Step (20 minutes)

#### 1. Deploy Backend to Railway
```bash
# Follow Railway guide in STAGING_DEPLOYMENT.md
# Get backend URL: https://lunchsync-backend.up.railway.app
```

#### 2. Deploy Frontend to Vercel
```bash
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel

# When prompted:
# - Root directory: ./
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist

# Set environment variable
vercel env add VITE_API_URL
# Enter: https://lunchsync-backend.up.railway.app/api

# Deploy to production
vercel --prod
```

#### 3. Update Backend CORS
```bash
# In Railway dashboard:
# Backend service → Variables
# Add: FRONTEND_URL=https://your-app.vercel.app
```

**Done!** Your app is live:
- Frontend: `https://your-app.vercel.app` (Vercel)
- Backend: `https://lunchsync-backend.up.railway.app` (Railway)

---

## Vercel Configuration Files

### frontend/vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "VITE_API_URL": ""
  }
}
```

---

## Environment Variables

### Vercel Dashboard Setup

1. Go to Project → Settings → Environment Variables
2. Add:
   ```
   VITE_API_URL = https://your-backend.up.railway.app/api
   ```
3. Select: Production, Preview, Development
4. Save

### Via CLI

```bash
# Production
vercel env add VITE_API_URL production

# Preview (for PR previews)
vercel env add VITE_API_URL preview

# Development
vercel env add VITE_API_URL development
```

---

## Vercel Preview Deployments (PR Previews)

Every PR gets a preview URL:

```
https://your-app-git-feature-branch-username.vercel.app
```

**Tip:** Use different backend for previews:
- Production: Production Railway backend
- Preview: Staging Railway backend

---

## Custom Domain on Vercel

```bash
# Add custom domain
vercel domains add yourdomain.com

# Or via dashboard:
# Project → Settings → Domains → Add
```

Vercel automatically provisions SSL certificate.

---

## Monitoring & Analytics

### Vercel Analytics (Built-in)

Enable in dashboard:
- Real User Monitoring
- Web Vitals
- Page load metrics
- Free tier: 100k events/month

### Vercel Speed Insights

```bash
npm install @vercel/speed-insights
```

Add to `frontend/src/main.tsx`:
```typescript
import { SpeedInsights } from '@vercel/speed-insights/react';

// In your App component
<SpeedInsights />
```

---

## Conclusion & Recommendation

### ✅ RECOMMENDED: Hybrid Deployment

**Frontend on Vercel + Backend on Railway**

**Pros:**
- Best frontend performance (Vercel CDN)
- Full backend features (Railway)
- WebSockets work perfectly
- Easy setup
- Affordable ($5-10/month)

**Cons:**
- Two platforms to manage (minimal overhead)

### ❌ NOT RECOMMENDED: Full Vercel

**Why?**
- Requires extensive backend refactoring
- WebSocket limitations
- Higher cost ($40-55/month)
- More complexity
- Cold starts on backend

### ✅ ALTERNATIVE: Railway Only

**If you want simplicity:**
- All services in one place
- Slightly slower frontend (no global CDN)
- Still very good performance
- Easier management

---

## Quick Reference

| Deployment | Frontend | Backend | DBs | Cost/mo | Setup | Best For |
|------------|----------|---------|-----|---------|-------|----------|
| **Vercel + Railway** | Vercel | Railway | Railway | $5-10 | 20min | Production |
| **Railway Only** | Railway | Railway | Railway | $5-15 | 10min | Quick staging |
| **Render Only** | Render | Render | Render | $0-21 | 15min | Free tier |
| **Full Vercel** | Vercel | Vercel | External | $40-55 | 2-3 days | Not ideal |

---

## Next Steps

1. **Choose your approach:**
   - Hybrid: Vercel (Frontend) + Railway (Backend) ← Recommended
   - Simple: Railway only

2. **Follow deployment guide:**
   - Hybrid: This document
   - Railway: `STAGING_DEPLOYMENT.md`

3. **Test thoroughly:**
   - Authentication flow
   - Real-time notifications
   - API calls
   - WebSocket connections

4. **Set up monitoring:**
   - Vercel Analytics (if using Vercel)
   - Railway metrics
   - Error tracking (Sentry, etc.)

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **LunchSync Deployment:** See `STAGING_DEPLOYMENT.md`
