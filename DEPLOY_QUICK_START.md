# 🚀 Quick Deploy to Staging - Cheat Sheet

## Best Options Summary

| Option | Setup Time | Cost/Month | Best For |
|--------|-----------|------------|----------|
| **Vercel + Railway** | 20 min | $5-10 | Production (best performance) |
| **Railway Only** | 10 min | $5-10 | Staging (easiest) |
| **Render** | 15 min | $0-21 | Free tier testing |

---

## Option 0: Vercel (Frontend) + Railway (Backend) - BEST PERFORMANCE

### Frontend Deploy (Vercel)

```bash
cd frontend
vercel login
vercel
# Follow prompts, set VITE_API_URL when asked
```

**Set environment in Vercel Dashboard:**
```
VITE_API_URL=https://your-backend.up.railway.app/api
```

### Backend Deploy (Railway)

See "Option 1" below for Railway deployment steps.

**Set CORS in Railway Backend:**
```
FRONTEND_URL=https://your-app.vercel.app
```

**Result:**
- ⚡ Ultra-fast frontend on Vercel CDN  
- 🔌 Full backend with WebSockets on Railway  
- 💰 Cost: $5-10/month

**Full guide:** `docs/deployment/VERCEL_DEPLOYMENT.md`

---

## Option 1: Railway Only (EASIEST - 10 minutes)

### One-Time Setup
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login
```

### Deploy Steps
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `lunch.app` repository
4. Railway auto-detects services

### Add Databases
- Click "+ New" → "Database" → "PostgreSQL"
- Click "+ New" → "Database" → "Redis"

### Configure Environment Variables

**Backend Service:**
```env
NODE_ENV=production
JWT_SECRET=<generate-random-32-char-string>
FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
NOTIFICATIONS_REDIS_TLS=true
```

**Frontend Service:**
```env
VITE_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

### Deploy
- Push to GitHub → Auto-deploys
- Monitor at https://railway.app/dashboard

**Done! Your app is live at:**
- Frontend: `https://your-app.up.railway.app`
- Backend: `https://your-api.up.railway.app`

---

## Option 2: Render (15 minutes)

### Deploy Steps
1. Go to https://render.com
2. Click "New" → "Blueprint"
3. Connect GitHub repo
4. Select `render.yaml` from root

### Update Frontend Environment
After deploy, update `VITE_API_URL` in frontend service:
```
https://<your-backend-url>.onrender.com/api
```

**Done! Services auto-deploy on push.**

---

## Required Files (Already Created)

✅ `backend/Dockerfile` - Production backend image  
✅ `frontend/Dockerfile` - Production frontend image  
✅ `frontend/nginx.conf` - Nginx configuration  
✅ `render.yaml` - Render blueprint (optional)  
✅ `deploy-railway.sh` - Helper script  

---

## Environment Variables Quick Reference

### Backend Required
- `NODE_ENV=production`
- `DATABASE_URL=<auto-provided-by-platform>`
- `REDIS_URL=<auto-provided-by-platform>`
- `JWT_SECRET=<generate-random-string>`
- `FRONTEND_URL=<your-frontend-url>`
- `NOTIFICATIONS_REDIS_URL=<auto-provided>`
- `NOTIFICATIONS_REDIS_TLS=true`

### Frontend Required
- `VITE_API_URL=https://your-backend.com/api`

---

## Testing After Deploy

```bash
# Test backend health
curl https://your-backend-url.com/health

# Test API
curl https://your-backend-url.com/api/auth/health

# Test frontend
curl -I https://your-frontend-url.com
```

---

## Common Issues

**Build fails:** Check Dockerfile paths and dependencies  
**DB connection fails:** Verify DATABASE_URL is set  
**Frontend can't reach backend:** Check VITE_API_URL includes `/api`  
**CORS errors:** Verify FRONTEND_URL matches deployed frontend domain  

---

## Cost

**Railway:** $0-10/month (free $5 credit)  
**Render:** $0/month (free tier with cold starts) or $21/month (always-on)  

---

## Full Documentation

- **Complete Guide:** `docs/deployment/STAGING_DEPLOYMENT.md`
- **Platform Comparison:** `docs/deployment/PLATFORM_COMPARISON.md`
- **Local Setup:** `docs/deployment/DEPLOYMENT.md`

---

## Next Steps After Deploy

1. ✅ Test login/registration
2. ✅ Create test company and users
3. ✅ Test event creation and ordering
4. ✅ Verify real-time notifications work
5. ✅ Set up monitoring alerts
6. ✅ Configure custom domain (optional)
