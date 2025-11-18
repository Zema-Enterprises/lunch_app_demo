# Railway Environment Variables Template

## Backend Service Variables

Copy these to your Railway Backend service (Settings → Variables):

```bash
# Environment
NODE_ENV=production
PORT=5000

# Database (Auto-filled by Railway when you add PostgreSQL)
# DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Auto-filled by Railway when you add Redis)  
# REDIS_URL=${{Redis.REDIS_URL}}
# NOTIFICATIONS_REDIS_URL=${{Redis.REDIS_URL}}

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING
JWT_EXPIRES_IN=7d

# CORS (Fill after deploying frontend)
# FRONTEND_URL=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
# For now, use: FRONTEND_URL=https://your-frontend-name.up.railway.app

# Redis TLS
NOTIFICATIONS_REDIS_TLS=true
```

## Frontend Service Variables

Copy these to your Railway Frontend service (Settings → Variables):

```bash
# API URL (Fill after deploying backend)
# VITE_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}/api
# For now, use: VITE_API_URL=https://your-backend-name.up.railway.app/api
```

---

## Step-by-Step Setup

### 1. Generate JWT Secret

```bash
# Generate a random 32-character string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it for `JWT_SECRET`

### 2. Deploy Backend First

1. Add PostgreSQL database to project
2. Add Redis to project
3. Add backend service
4. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET=<your-generated-secret>`
   - `JWT_EXPIRES_IN=7d`
   - `NOTIFICATIONS_REDIS_TLS=true`
5. Wait for deployment to complete
6. Copy the backend public URL (e.g., `lunchsync-backend.up.railway.app`)

### 3. Deploy Frontend

1. Add frontend service
2. Set environment variable:
   - `VITE_API_URL=https://<backend-url>/api`
3. Wait for deployment to complete
4. Copy the frontend public URL (e.g., `lunchsync-frontend.up.railway.app`)

### 4. Update Backend CORS

1. Go back to backend service
2. Add/Update environment variable:
   - `FRONTEND_URL=https://<frontend-url>`
3. Redeploy backend service

### 5. Link Services (Railway Auto-Links)

Railway automatically connects services when you use:
- `${{Postgres.DATABASE_URL}}`
- `${{Redis.REDIS_URL}}`
- `${{Frontend.RAILWAY_PUBLIC_DOMAIN}}`

---

## Verification Checklist

After setup, verify:

- [ ] Backend service is running (green status)
- [ ] Frontend service is running (green status)
- [ ] PostgreSQL database is healthy
- [ ] Redis instance is healthy
- [ ] Backend health check works: `curl https://<backend-url>/health`
- [ ] Frontend loads: `curl https://<frontend-url>`
- [ ] Can login/register users
- [ ] Real-time notifications work

---

## Railway Reference Variables

These are auto-populated by Railway:

| Variable | Description | Example |
|----------|-------------|---------|
| `${{Postgres.DATABASE_URL}}` | PostgreSQL connection string | `postgresql://...` |
| `${{Redis.REDIS_URL}}` | Redis connection string | `redis://...` |
| `${{Backend.RAILWAY_PUBLIC_DOMAIN}}` | Backend public URL | `backend.up.railway.app` |
| `${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` | Frontend public URL | `frontend.up.railway.app` |
| `${{Railway.ENVIRONMENT}}` | Railway environment | `production` |

---

## Troubleshooting

### Backend won't start
- Check logs for errors
- Verify DATABASE_URL is set
- Ensure migrations ran successfully

### Frontend can't reach backend
- Verify VITE_API_URL is correct
- Check it includes `/api` at the end
- Test backend URL directly

### CORS errors
- Verify FRONTEND_URL matches frontend domain
- Include https:// prefix
- No trailing slash

### Database connection errors
- Verify PostgreSQL service is running
- Check DATABASE_URL format
- Test connection in backend logs

---

## Next: Custom Domain (Optional)

1. Go to service Settings → Domains
2. Click "Custom Domain"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed
5. Railway auto-provisions SSL certificate
6. Update environment variables to use custom domains
