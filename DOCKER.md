# Docker Setup for LunchSync

This document describes how to run LunchSync using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### Option 1: Using the startup script
```bash
./start.sh
```

### Option 2: Manual docker-compose commands
```bash
# Start all services (build if needed)
docker-compose up --build

# Start in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean shutdown (remove volumes)
docker-compose down -v
```

## Services

### PostgreSQL Database
- **Container**: `lunchsync-postgres`
- **Port**: 5434 (host) → 5432 (container)
- **Credentials**:
  - User: `lunchsync`
  - Password: `lunchsync123`
  - Database: `lunchsync`
- **Health Check**: `pg_isready` every 10s

### Backend API
- **Container**: `lunchsync-backend`
- **Port**: 5000
- **URL**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **Features**:
  - Auto-runs Prisma migrations on startup
  - Auto-seeds database with test data
  - Hot-reload enabled (nodemon)
  - Depends on healthy postgres service

### Frontend Web App
- **Container**: `lunchsync-frontend`
- **Port**: 3000
- **URL**: http://localhost:3000
- **Features**:
  - Vite dev server with HMR
  - Hot-reload enabled
  - Depends on backend service

## Development Workflow

### Making Code Changes
All changes to `backend/` and `frontend/` directories are automatically synced to containers via volume mounts. The dev servers will hot-reload automatically.

### Database Operations

```bash
# Access database shell
docker-compose exec postgres psql -U lunchsync -d lunchsync

# Run migrations
docker-compose exec backend npx prisma migrate dev

# Reseed database
docker-compose exec backend npm run seed

# View Prisma Studio
docker-compose exec backend npx prisma studio
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restarting Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Clean Rebuild

If you encounter issues, perform a clean rebuild:

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## Troubleshooting

### Backend fails to start
- Check if database is healthy: `docker-compose ps`
- View backend logs: `docker-compose logs backend`
- Common issue: Database not ready - backend will retry automatically

### Frontend can't connect to backend
- Ensure backend is running: `curl http://localhost:5000/health`
- Check frontend environment: `docker-compose exec frontend env | grep VITE_API_URL`
- Should be: `VITE_API_URL=http://localhost:5000`

### Port conflicts
If ports 3000, 5000, or 5434 are already in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

### Permission issues (Linux)
If you get permission errors with volumes:
```bash
sudo chown -R $USER:$USER backend frontend
```

## Environment Variables

Environment variables are configured in `docker-compose.yml`. To override:

1. Create `.env` file in project root:
```env
# Custom ports
BACKEND_PORT=5001
FRONTEND_PORT=3001
POSTGRES_PORT=5435

# Custom database
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
```

2. Update `docker-compose.yml` to use these variables

## Production Deployment

For production, create separate Dockerfiles and docker-compose.prod.yml:
- Use multi-stage builds
- Optimize image sizes
- Use production build commands
- Configure proper secrets management
- Set up reverse proxy (nginx)
- Enable SSL/TLS

## Network Architecture

```
┌─────────────────────────────────────────┐
│  Docker Network: lunchsync-network      │
│                                         │
│  ┌──────────┐    ┌──────────┐          │
│  │ Frontend │───▶│ Backend  │          │
│  │  :3000   │    │  :5000   │          │
│  └──────────┘    └────┬─────┘          │
│                       │                 │
│                       ▼                 │
│                  ┌──────────┐          │
│                  │ Postgres │          │
│                  │  :5432   │          │
│                  └──────────┘          │
└─────────────────────────────────────────┘
         │              │
         │              │
    Port 3000      Port 5000, 5434
    (exposed)      (exposed)
```

## Tips

1. **First run takes longer**: Docker needs to download images and install dependencies
2. **Subsequent runs are faster**: Docker caches layers
3. **Use `.dockerignore`**: Already configured to skip `node_modules`, `.env`, etc.
4. **Check health status**: `docker-compose ps` shows service health
5. **Resource limits**: Add resource limits in docker-compose.yml if needed

## Support

For issues related to:
- **Docker setup**: Check this README
- **Application bugs**: See main project README.md
- **Database issues**: See backend/prisma/README.md
