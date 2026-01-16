#!/bin/bash

# Health Check Script
# Verifies all services are running correctly

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🏥 Running Health Checks...${NC}"
echo ""

# Check PostgreSQL
echo -n "PostgreSQL: "
if sudo systemctl is-active --quiet postgresql; then
  echo -e "${GREEN}✅ Running${NC}"
else
  echo -e "${RED}❌ Not running${NC}"
fi

# Check Nginx
echo -n "Nginx: "
if sudo systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Running${NC}"
else
  echo -e "${RED}❌ Not running${NC}"
fi

# Check Backend (PM2)
echo -n "Backend (PM2): "
if pm2 list | grep -q "vms-backend.*online"; then
  echo -e "${GREEN}✅ Running${NC}"
else
  echo -e "${RED}❌ Not running${NC}"
fi

# Check Backend API
echo -n "Backend API: "
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$API_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✅ Responding (HTTP $API_RESPONSE)${NC}"
else
  echo -e "${RED}❌ Not responding (HTTP $API_RESPONSE)${NC}"
fi

# Check Frontend files
echo -n "Frontend Build: "
if [ -f "/var/www/vms/dist/index.html" ]; then
  echo -e "${GREEN}✅ Exists${NC}"
else
  echo -e "${RED}❌ Not found${NC}"
fi

# Check disk space
echo ""
echo -e "${YELLOW}💾 Disk Usage:${NC}"
df -h / | grep -v Filesystem

# Check memory
echo ""
echo -e "${YELLOW}🧠 Memory Usage:${NC}"
free -h | grep -E "Mem|Swap"

# Check PM2 processes
echo ""
echo -e "${YELLOW}📊 PM2 Processes:${NC}"
pm2 list

# Check recent logs
echo ""
echo -e "${YELLOW}📝 Recent Backend Logs (last 10 lines):${NC}"
pm2 logs vms-backend --lines 10 --nostream

# Check Nginx errors
echo ""
echo -e "${YELLOW}⚠️  Recent Nginx Errors (last 5):${NC}"
sudo tail -n 5 /var/log/nginx/vms_error.log 2>/dev/null || echo "No errors found"

echo ""
echo -e "${GREEN}✅ Health check completed${NC}"
