#!/bin/bash

# Vendor Management System - Deployment Script
# This script deploys updates to the production server

set -e

echo "🚀 Starting deployment..."

# Configuration
APP_DIR="/var/www/vms"
BACKEND_DIR="$APP_DIR/backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop backend
echo -e "${YELLOW}⏸  Stopping backend...${NC}"
pm2 stop vms-backend || true

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
cd $APP_DIR
git pull origin main

# Update backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd $BACKEND_DIR
npm install --production

# Update frontend
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd $APP_DIR
npm install

# Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build

# Restart backend
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
pm2 restart vms-backend

# Reload Nginx
echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
sudo systemctl reload nginx

# Check status
echo -e "${YELLOW}🔍 Checking status...${NC}"
pm2 list

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Logs:"
echo "  Backend: pm2 logs vms-backend"
echo "  Nginx: sudo tail -f /var/log/nginx/vms_error.log"
echo ""
echo "🌐 Application URLs:"
echo "  Frontend: http://$(curl -s ifconfig.me)"
echo "  Health Check: http://$(curl -s ifconfig.me)/api/health"
