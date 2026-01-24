# Production Environment Configuration Guide

## Overview

This guide covers converting your dev environment to production-ready configuration with secure credentials, correct database settings, and proper secret management.

---

## 1. Backend Environment Variables (.env.production)

### A. Core Application Settings

```bash
NODE_ENV=production
PORT=3001
```

**Notes:**

- `NODE_ENV=production` disables development logging and enables optimizations
- `PORT` can be 3001 or whatever your hosting platform injects

---

### B. PostgreSQL Production Database

Replace placeholder values with your actual production database credentials:

```bash
# PostgreSQL Production Connection
PGHOST=your-prod-db-host.rds.amazonaws.com     # e.g., AWS RDS endpoint
PGPORT=5432
PGDATABASE=vms_prod                             # Different from dev database
PGUSER=vms_prod_user                            # Do NOT use 'postgres'
PGPASSWORD=YourStrongProductionPassword123!    # 20+ characters, alphanumeric + special
PGSSLMODE=require                               # Always use SSL in production
```

**Security Checklist:**

- ✅ Use a **different database** for production (vms_prod, not vms)
- ✅ Use a **different user** for production (never reuse postgres)
- ✅ Use a **strong password** (20+ chars, mix of upper/lower/numbers/special)
- ✅ **Enable SSL** (PGSSLMODE=require)
- ✅ Store credentials in your hosting platform's secret manager (NOT in Git)

**Database Provider Examples:**

**AWS RDS:**

```bash
PGHOST=vms-db.c9akciq32.us-east-1.rds.amazonaws.com
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=vms_admin
PGPASSWORD=YourStrongPassword123!
PGSSLMODE=require
```

**DigitalOcean Managed Database:**

```bash
PGHOST=db-mysql-nyc3-1234.ondigitalocean.com
PGPORT=25060
PGDATABASE=vms_prod
PGUSER=vms_admin
PGPASSWORD=YourStrongPassword123!
PGSSLMODE=require
```

**Google Cloud SQL:**

```bash
PGHOST=/cloudsql/your-project:us-central1:vms-db
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=vms_admin
PGPASSWORD=YourStrongPassword123!
PGSSLMODE=require
```

---

### C. Authentication Secrets

```bash
# JWT Secret - MUST be a strong, random value
JWT_SECRET=your_long_random_production_secret_32_chars_minimum_abc123!@#xyz789
```

**How to generate a strong JWT secret:**

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Using an online generator
# https://www.random.org/strings/ (100 alphanumeric chars)
```

**Security Requirements:**

- ✅ At least 32 characters
- ✅ Random and unique per environment
- ✅ Never use development secrets in production
- ✅ Rotate periodically (quarterly recommended)
- ✅ Store in secret manager, not in Git

---

### D. ERP Integration

```bash
# ERP Production API Key
ERP_API_KEY=prod_erp_key_from_your_erp_provider_123abc

# ERP Production Base URL (if applicable)
ERP_API_BASE_URL=https://erp-api.yourerpprovider.com/api/v1
```

**Steps:**

1. Contact your ERP provider for **production API key**
2. Use their **production API endpoint** (not sandbox/staging)
3. Store key in secret manager, never in code

---

### E. Supabase (If Still Using)

```bash
# Supabase Production Project (if needed)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Critical Security Rules:**

- Use **separate Supabase project** for production
- Generate **new keys** for production (don't copy from dev)
- **SERVICE_ROLE_KEY must never** be exposed to frontend
- Rotate keys regularly

---

## 2. Frontend Environment Variables (.env.production)

```bash
# API Configuration - Production
VITE_API_URL=https://api.yourdomain.com
# OR use relative URLs if frontend and backend share same domain:
# VITE_USE_RELATIVE_API_URL=true

# Optional: Supabase (public keys only)
# VITE_SUPABASE_URL=https://your-prod-project.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Configuration Strategies:**

**Option 1: Separate API Domain**

```bash
VITE_API_URL=https://api.yourdomain.com
```

Use this if frontend and backend are on different domains.

**Option 2: Same Domain (Recommended)**

```bash
VITE_USE_RELATIVE_API_URL=true
```

Frontend at `https://yourdomain.com`, backend at `https://yourdomain.com/api`
This avoids CORS issues and is simpler to deploy.

**Option 3: Environment Variable Injection**

```bash
VITE_API_URL=${PROD_API_URL}
```

Let your hosting platform inject the URL at deployment time.

---

## 3. Secret Management Best Practices

### ❌ DON'T:

- Store secrets in `.env.production` file committed to Git
- Use development secrets in production
- Share production credentials in Slack, email, or code reviews
- Hardcode API keys in code
- Store plain passwords in database

### ✅ DO:

- Use your hosting platform's secret manager:
  - **AWS**: Secrets Manager or Parameter Store
  - **Render**: Environment variables in dashboard
  - **Railway**: Variables section
  - **Heroku**: Config Vars
  - **DigitalOcean**: App Platform Environment Variables
  - **Vercel**: Environment Variables
- Rotate secrets regularly (quarterly minimum)
- Use different secrets for each environment
- Audit who has access to production secrets
- Use strong, random values (30+ characters)

---

## 4. Deployment Platform Examples

### AWS EC2 + RDS

**Backend Server Environment Variables:**

```bash
NODE_ENV=production
PORT=3001
PGHOST=vms-db.c9akciq32.us-east-1.rds.amazonaws.com
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=vms_admin
PGPASSWORD=YourStrongPassword123!
PGSSLMODE=require
JWT_SECRET=prod_jwt_secret_32_chars_random_123abc
ERP_API_KEY=prod_erp_key_123abc
```

**Frontend Environment Variables:**

```bash
VITE_API_URL=https://api.yourdomain.com
```

### Render.com

**Backend Service:**

1. Connect GitHub repo
2. Set Environment:
   ```
   NODE_ENV=production
   PORT=3001
   PGHOST=<your-postgres-host>
   PGPORT=5432
   PGDATABASE=vms_prod
   PGUSER=<your-user>
   PGPASSWORD=<your-password>
   PGSSLMODE=require
   JWT_SECRET=<generate-random>
   ERP_API_KEY=<your-erp-key>
   ```
3. Start command: `node src/server.js`

**Frontend Static Site:**

1. Connect GitHub repo
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Environment:
   ```
   VITE_API_URL=https://<your-backend-url>
   ```

### Railway.app

**Backend:**

1. Create service from GitHub
2. Add Postgres plugin
3. Set environment variables in Variables tab
4. Start command: `npm install && npm start`

**Frontend:**

1. Create separate service from GitHub
2. Build command: `npm install && npm run build`
3. Start command: `npm run preview`
4. Add environment variables

### Vercel (Frontend) + External Backend

**Frontend (.env.production):**

```bash
VITE_API_URL=https://api.yourdomain.com
```

Set in Vercel dashboard:

1. Project Settings → Environment Variables
2. Add `VITE_API_URL` → `https://api.yourdomain.com`

---

## 5. Pre-Deployment Checklist

- [ ] NODE_ENV=production set on backend
- [ ] Database host points to production database (not localhost)
- [ ] Database name is different (vms_prod, not vms)
- [ ] Database user is not 'postgres'
- [ ] Database password is strong (20+ chars, mixed case + numbers + special)
- [ ] PGSSLMODE=require for database
- [ ] JWT_SECRET is random and 32+ characters
- [ ] ERP_API_KEY is production key (not dev/sandbox)
- [ ] All secrets stored in secret manager, not Git
- [ ] Frontend VITE_API_URL points to production backend
- [ ] CORS configured correctly on backend for production domain
- [ ] SSL/TLS enabled on both frontend and backend
- [ ] Database backups configured
- [ ] Monitoring and logging enabled
- [ ] Error tracking (Sentry, LogRocket, etc.) configured
- [ ] Rate limiting enabled on API endpoints
- [ ] API keys rotated and old ones revoked

---

## 6. After Deployment

1. **Test endpoints** with curl or Postman:

   ```bash
   curl https://api.yourdomain.com/api/v1/health
   ```

2. **Check logs** for errors:

   ```bash
   # On your hosting platform's log viewer
   ```

3. **Verify JWT works**:

   ```bash
   curl -X POST https://api.yourdomain.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'
   ```

4. **Monitor database connection**:

   ```bash
   # Check connection pool from hosting platform dashboard
   ```

5. **Set up alerts** for:
   - High error rate
   - Database connection failures
   - Memory/CPU usage spikes

---

## 7. Security Hardening (Optional but Recommended)

```bash
# Backend additional variables for security:
CORS_ORIGIN=https://yourdomain.com
API_RATE_LIMIT_WINDOW=15m
API_RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=warn  # Don't log everything in production
```

---

**Need help with a specific platform? Let me know where you're deploying!**
