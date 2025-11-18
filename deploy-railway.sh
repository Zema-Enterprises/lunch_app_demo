#!/bin/bash

# LunchSync - Railway Deployment Script
# This script helps you deploy to Railway quickly

set -e

echo "🚂 LunchSync Railway Deployment Helper"
echo "======================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found"
    echo ""
    echo "Install it with:"
    echo "  npm i -g @railway/cli"
    echo ""
    echo "OR deploy via Railway Dashboard:"
    echo "  https://railway.app/new"
    echo ""
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Login check
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

echo "✅ Authenticated"
echo ""

# Initialize project
echo "📦 Initializing Railway project..."
if [ ! -f "railway.json" ]; then
    railway init
else
    echo "✅ Project already initialized"
fi

echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Add PostgreSQL database:"
echo "   railway add --database postgresql"
echo ""
echo "2. Add Redis:"
echo "   railway add --database redis"
echo ""
echo "3. Deploy backend:"
echo "   cd backend && railway up"
echo ""
echo "4. Deploy frontend:"
echo "   cd frontend && railway up"
echo ""
echo "5. Set environment variables in Railway Dashboard:"
echo "   https://railway.app/dashboard"
echo ""
echo "   Backend variables:"
echo "   - JWT_SECRET (generate random string)"
echo "   - FRONTEND_URL (copy from frontend service URL)"
echo "   - NOTIFICATIONS_REDIS_TLS=true"
echo ""
echo "   Frontend variables:"
echo "   - VITE_API_URL (copy backend service URL + /api)"
echo ""
echo "6. Monitor deployment:"
echo "   railway logs"
echo ""
echo "📚 Full guide: docs/deployment/STAGING_DEPLOYMENT.md"
echo ""
