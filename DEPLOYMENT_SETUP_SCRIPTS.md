#!/bin/bash

# Deployment Helper Scripts

# ============================================================

# HEROKU DEPLOYMENT

# ============================================================

# Setup environment on Heroku

# heroku-setup.sh

#!/bin/bash
APP_NAME="your-app-name"

echo "Setting up Heroku environment variables..."

heroku config:set \
 NODE_ENV=production \
 PGHOST=$HEROKU_POSTGRES_HOST \
  PGPORT=5432 \
  PGDATABASE=$HEROKU_POSTGRES_DB \
 PGUSER=$HEROKU_POSTGRES_USER \
  PGPASSWORD=$HEROKU_POSTGRES_PASSWORD \
 PGSSLMODE=require \
 JWT_SECRET=$(openssl rand -base64 32) \
  ERP_API_KEY="your_erp_key" \
  VITE_API_URL="https://$APP_NAME.herokuapp.com" \
 VITE_USE_RELATIVE_API_URL=true \
 -a $APP_NAME

echo "✅ Environment variables set on Heroku"

# ============================================================

# AWS ELASTIC BEANSTALK DEPLOYMENT

# ============================================================

# Create .ebextensions/environment.config

cat > .ebextensions/environment.config << 'EOF'
option_settings:
aws:autoscaling:launchconfiguration:
IamInstanceProfile: aws-elasticbeanstalk-ec2-role
aws:elasticbeanstalk:application:environment:
NODE_ENV: production
PGHOST: your-rds-endpoint.amazonaws.com
PGPORT: 5432
PGDATABASE: vms_prod
PGUSER: postgres
PGPASSWORD: your_secure_password
PGSSLMODE: require
JWT_SECRET: your_secret_key
ERP_API_KEY: your_erp_key
VITE_API_URL: https://your-domain.com
VITE_USE_RELATIVE_API_URL: "false"
EOF

# Deploy

# eb deploy

# ============================================================

# RAILWAY.APP DEPLOYMENT

# ============================================================

# railway-setup.sh

#!/bin/bash

echo "Setting Railway environment variables..."

railway variables set \
 NODE_ENV=production \
 PGHOST=postgres \
 PGPORT=5432 \
 PGDATABASE=vms_prod \
 PGUSER=postgres \
 PGPASSWORD=your_secure_password \
 PGSSLMODE=require \
 JWT_SECRET=$(openssl rand -base64 32) \
 ERP_API_KEY=your_erp_key \
 VITE_API_URL=https://your-domain.com \
 VITE_USE_RELATIVE_API_URL=true

echo "✅ Railway environment variables configured"
echo "Deploy with: railway up"

# ============================================================

# DOCKER DEPLOYMENT

# ============================================================

# Dockerfile example

FROM node:18-alpine

WORKDIR /app

# Copy backend

COPY backend ./backend
COPY backend/package\*.json ./backend/

# Copy frontend

COPY . ./

# Install dependencies

RUN cd backend && npm ci
RUN npm ci

# Build frontend

RUN npm run build

# Expose port

EXPOSE 3001

# Start backend

CMD ["node", "backend/src/server.js"]

# ============================================================

# docker-compose.yml example

version: '3.8'

services:
postgres:
image: postgres:15-alpine
environment:
POSTGRES_DB: vms_prod
POSTGRES_USER: postgres
POSTGRES_PASSWORD: ${PGPASSWORD}
volumes: - postgres_data:/var/lib/postgresql/data
ports: - "5432:5432"

backend:
build: ./backend
environment:
NODE_ENV: production
PGHOST: postgres
PGPORT: 5432
PGDATABASE: vms_prod
PGUSER: postgres
PGPASSWORD: ${PGPASSWORD}
PGSSLMODE: disable
JWT_SECRET: ${JWT_SECRET}
ERP_API_KEY: ${ERP_API_KEY}
ports: - "3001:3001"
depends_on: - postgres

volumes:
postgres_data:

# Run with: docker-compose up --build

# ============================================================

# ENVIRONMENT VALIDATION SCRIPT

# ============================================================

# validate-env.sh

#!/bin/bash

echo "Validating environment variables..."

REQUIRED_VARS=(
"NODE_ENV"
"PGHOST"
"PGPORT"
"PGDATABASE"
"PGUSER"
"PGPASSWORD"
"PGSSLMODE"
"JWT_SECRET"
)

MISSING=false

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
echo "❌ Missing: $var"
MISSING=true
else
echo "✅ $var is set"
fi
done

if [ "$MISSING" = true ]; then
echo ""
echo "Some required environment variables are missing!"
exit 1
else
echo ""
echo "✅ All required environment variables are set"
exit 0
fi

# ============================================================

# DATABASE MIGRATION SCRIPT

# ============================================================

# deploy-with-migration.sh

#!/bin/bash

set -e

echo "🚀 Deploying VMS to production..."

# 1. Validate environment

echo "Step 1: Validating environment..."
./validate-env.sh

# 2. Install dependencies

echo "Step 2: Installing dependencies..."
cd backend && npm ci && cd ..
npm ci

# 3. Run database migrations (if using migrations)

echo "Step 3: Running database migrations..."

# cd backend && npm run db:migrate && cd ..

# 4. Build frontend

echo "Step 4: Building frontend..."
npm run build

# 5. Start backend

echo "Step 5: Starting backend..."
cd backend && npm run start &

echo "✅ Deployment complete!"
echo ""
echo "📊 Verify:"
echo " - Backend: http://localhost:3001/api/v1/health"
echo " - Database: Check PGHOST, PGDATABASE"
echo " - Logs: Check Docker/PM2/system logs"

# ============================================================

# PM2 ECOSYSTEM FILE (for VPS/EC2 deployments)

# ============================================================

# ecosystem.config.js

module.exports = {
apps: [
{
name: 'vms-backend',
script: 'backend/src/server.js',
instances: 'max',
exec_mode: 'cluster',
env: {
NODE_ENV: 'production',
PORT: 3001,
},
error_file: './logs/err.log',
out_file: './logs/out.log',
merge_logs: true,
max_memory_restart: '1G',
},
{
name: 'vms-frontend',
script: 'npm',
args: 'run preview',
instances: 1,
env: {
NODE_ENV: 'production',
PORT: 3000,
},
},
],
};

# Start with: pm2 start ecosystem.config.js

# Monitor: pm2 monit

# Logs: pm2 logs

# ============================================================

# PRODUCTION CHECKLIST

# ============================================================

PRODUCTION_CHECKLIST=$(cat << 'EOF'

✅ PRE-DEPLOYMENT CHECKLIST

Environment Configuration:
[ ] NODE_ENV set to 'production'
[ ] PGHOST points to production database
[ ] PGPORT correct (usually 5432)
[ ] PGDATABASE is production database name
[ ] PGUSER is database user
[ ] PGPASSWORD is strong password (16+ chars)
[ ] PGSSLMODE set to 'require'

Application Secrets:
[ ] JWT_SECRET is strong random (32+ chars)
[ ] ERP_API_KEY is set and correct
[ ] All secrets stored in platform's secret manager
[ ] No secrets in code or git history

Frontend Configuration:
[ ] VITE_API_URL points to correct API endpoint
[ ] VITE_USE_RELATIVE_API_URL set correctly
[ ] Built with: npm run build

Infrastructure:
[ ] Production database exists and is accessible
[ ] Database backups configured
[ ] SSL certificate configured
[ ] Firewall rules allow database access
[ ] Memory/CPU resources adequate
[ ] Monitoring/alerting configured

Security:
[ ] HTTPS enabled
[ ] CORS configured correctly
[ ] Rate limiting enabled
[ ] API key validation working
[ ] Database password is secure
[ ] No debug logs in production

Post-Deployment:
[ ] Test health endpoint: /api/v1/health
[ ] Test login flow end-to-end
[ ] Check logs for errors
[ ] Verify database connections
[ ] Monitor for performance issues
[ ] Verify backups are working

EOF
echo "$PRODUCTION_CHECKLIST"
)

# ============================================================

# END OF DEPLOYMENT SCRIPTS

# ============================================================
