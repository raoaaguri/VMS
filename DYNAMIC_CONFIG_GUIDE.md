# Dynamic Database Configuration Guide

## Overview

Your project is now configured to dynamically switch between **local development** and **production databases** based on the environment. No more hardcoded URLs!

---

## Backend Configuration

### Development Environment

The backend uses `.env` file for local development:

```env
# backend/.env
NODE_ENV=development
PGHOST=localhost
PGPORT=5432
PGDATABASE=vms
PGUSER=postgres
PGPASSWORD=root
PGSSLMODE=disable
```

**To run locally:**

```bash
cd backend
npm run dev
```

---

### Production Environment

For production deployment, use `.env.production` or set environment variables directly:

**Option 1: Using `.env.production` file**

```env
NODE_ENV=production
PGHOST=your-prod-db.rds.amazonaws.com
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=prod_user
PGPASSWORD=your_secure_password
PGSSLMODE=require
JWT_SECRET=your_strong_secret_key
ERP_API_KEY=your_erp_key
PORT=3001
```

**Option 2: Using platform environment variables (Recommended for production)**

Most deployment platforms (Heroku, AWS, Azure, Railway, etc.) allow you to set environment variables through their dashboard:

```
NODE_ENV = production
PGHOST = your-database-host
PGPORT = 5432
PGDATABASE = vms_prod
PGUSER = postgres
PGPASSWORD = your_password
PGSSLMODE = require
JWT_SECRET = your_secret_key
ERP_API_KEY = your_api_key
```

**How it works:**

- The `env.js` file checks `NODE_ENV`
- In production mode, it loads `.env.production` or reads from system environment variables
- All variables are validated - missing critical vars throw errors
- SSL is automatically enforced for production

---

## Frontend Configuration

### Development Environment

Local React development uses `.env`:

```env
# .env (Frontend)
VITE_API_URL=http://localhost:3001
VITE_USE_RELATIVE_API_URL=false
```

**To run locally:**

```bash
npm run dev
```

The frontend will call `http://localhost:3001` for API requests.

---

### Production Environment

For production, use `.env.production`:

**Option 1: Backend on different domain**

```env
# .env.production
VITE_API_URL=https://api.yourdomain.com
VITE_USE_RELATIVE_API_URL=false
```

**Option 2: Frontend and backend on same domain**

```env
# .env.production
VITE_USE_RELATIVE_API_URL=true
```

This makes all API calls relative (e.g., `/api/v1/...`), which works when serving both from the same origin.

**Option 3: Using window.location.origin**

```env
# Don't set VITE_API_URL - it will use the current origin
```

**How it works:**

- The `api.js` file checks import.meta.env variables
- If explicit URL is set, it uses that
- If relative URLs are enabled, it uses relative paths
- If nothing is set, it defaults to current origin in production

---

## Deployment Platforms Setup

### Heroku

1. Set environment variables in Heroku dashboard:
   ```
   heroku config:set NODE_ENV=production
   heroku config:set PGHOST=your-db-host.com
   heroku config:set PGPASSWORD=your_password
   ...
   ```

### AWS (EC2/Elastic Beanstalk)

Set environment variables in `.ebextensions/environment.config` or platform dashboard

### Railway/Render/Fly.io

Set environment variables in the deployment settings dashboard

### Docker

Pass environment variables at runtime:

```bash
docker run -e NODE_ENV=production \
           -e PGHOST=db.example.com \
           -e PGPASSWORD=secret \
           ...
           your-app:latest
```

---

## Database Setup for Production

### AWS RDS PostgreSQL Example

1. Create RDS PostgreSQL instance
2. Get the endpoint (e.g., `vms-db.xxxx.rds.amazonaws.com`)
3. Create database: `vms_prod`
4. Create user: `prod_user`
5. Set these as environment variables:
   ```
   PGHOST=vms-db.xxxx.rds.amazonaws.com
   PGPORT=5432
   PGDATABASE=vms_prod
   PGUSER=prod_user
   PGPASSWORD=your_secure_password
   PGSSLMODE=require
   ```

### DigitalOcean Managed Database

Similar to RDS - get connection details from DigitalOcean dashboard

### Self-hosted PostgreSQL

Set your server's IP/hostname as PGHOST

---

## Environment-specific Variables

### All Environments

```env
NODE_ENV          # development, staging, or production
PORT               # Backend port (default: 3001)
JWT_SECRET         # Secret key for JWT tokens
ERP_API_KEY        # Your ERP integration key
```

### Database (PostgreSQL)

```env
PGHOST             # Database host
PGPORT             # Database port (usually 5432)
PGDATABASE         # Database name
PGUSER             # Database user
PGPASSWORD         # Database password
PGSSLMODE          # disable (dev) or require (prod)
```

### Frontend API

```env
VITE_API_URL                  # API endpoint URL
VITE_USE_RELATIVE_API_URL     # true for same-origin, false for different domain
```

---

## Checking Configuration

### Backend

```bash
cd backend
npm run dev
# Should see: "📋 Configuration loaded:"
# Shows: Database connection details and port
```

### Frontend

Open browser console and check if API requests go to the correct endpoint.

---

## Security Checklist for Production

- [ ] Never commit `.env` files with secrets (already in `.gitignore`)
- [ ] Use strong JWT_SECRET (min 32 characters, random)
- [ ] Use strong database password
- [ ] Enable PGSSLMODE=require for production databases
- [ ] Store secrets in deployment platform's secret manager
- [ ] Use HTTPS for API endpoints
- [ ] Enable database backups
- [ ] Use separate database for production
- [ ] Rotate secrets periodically
- [ ] Monitor database connections

---

## Common Issues & Solutions

### Issue: Cannot connect to production database

- Check PGHOST, PGPORT, PGUSER, PGPASSWORD are correct
- Verify database server is accessible
- Check firewall/security groups allow your IP
- Ensure database exists and user has permissions

### Issue: Frontend gets 404 on API calls

- Check VITE_API_URL is correct
- Verify backend is running on that URL
- Check CORS is enabled in backend
- Use browser DevTools to see actual request URL

### Issue: SSL certificate error

- Set PGSSLMODE=require for prod
- Database must support SSL
- May need to set rejectUnauthorized=false (env.js already does this)

---

## Next Steps

1. **For Local Development**: Keep using `.env` as-is
2. **For Staging**: Create `.env.staging` with staging database details
3. **For Production**:
   - Choose your hosting platform
   - Set up production database
   - Configure environment variables
   - Update VITE_API_URL for frontend
   - Deploy!

---

## File Structure

```
VMS/
├── backend/
│   ├── .env                  # Local dev config
│   ├── .env.example          # Template for new developers
│   ├── .env.production       # Production config template
│   └── src/config/
│       └── env.js            # Loads config based on NODE_ENV
├── .env                      # Frontend local dev config
├── .env.example              # Frontend template
├── .env.production           # Frontend prod config
├── .env.staging              # Frontend staging config
└── src/config/
    └── api.js                # Dynamic API URL resolution
```

---

## Questions?

Refer to the original configuration files:

- Backend: `backend/src/config/env.js`
- Frontend: `src/config/api.js`

Both files have detailed comments explaining the logic.
