# Production Environment Variables - Deployment Template

## Backend (.env.production)

```bash
# ============================================================
# PRODUCTION DEPLOYMENT - FILL IN YOUR VALUES
# ============================================================

NODE_ENV=production
PORT=3001

# Database - Use your actual production database credentials
PGHOST=your-actual-prod-db-host.rds.amazonaws.com
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=vms_prod_user
PGPASSWORD=your_strong_password_here_20_chars_min
PGSSLMODE=require

# JWT Secret - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_generated_random_32_char_secret_here

# ERP Integration
ERP_API_KEY=your_production_erp_api_key_here
```

## Frontend (.env.production)

```bash
# ============================================================
# PRODUCTION DEPLOYMENT - FILL IN YOUR VALUES
# ============================================================

# Choose ONE of these options:

# Option A: If backend is on different domain
VITE_API_URL=https://api.yourdomain.com

# Option B: If backend and frontend on same domain
# VITE_USE_RELATIVE_API_URL=true
```

---

## Step-by-Step Production Deployment

### 1. Generate Strong Secrets

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Generate Database Password
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
# Output: f1e2d3c4b5a6z9y8x7w6v5u4t3s2r1q0
```

### 2. Create Production Database

**AWS RDS Example:**

- Engine: PostgreSQL 15
- DB Name: `vms_prod`
- Master Username: `vms_prod_user`
- Master Password: [use generated password from above]
- Public accessibility: No (only from EC2/App Server)
- Enable encryption: Yes
- Enable backup: Yes (7-35 day retention)

### 3. Fill Backend Env Variables

```bash
# backend/.env.production
NODE_ENV=production
PORT=3001
PGHOST=vms-db.c9akciq32.us-east-1.rds.amazonaws.com  # Your RDS endpoint
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=vms_prod_user
PGPASSWORD=f1e2d3c4b5a6z9y8x7w6v5u4t3s2r1q0          # Generated above
PGSSLMODE=require
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6         # Generated above
ERP_API_KEY=your_actual_prod_erp_key_here
```

### 4. Fill Frontend Env Variables

```bash
# .env.production

# If backend and frontend on same domain (Recommended):
VITE_USE_RELATIVE_API_URL=true

# OR if backend on different domain:
VITE_API_URL=https://api.yourdomain.com
```

### 5. Deploy to Your Platform

**Render.com Example:**

```bash
# 1. Go to dashboard.render.com
# 2. Create Web Service from GitHub
# 3. Set environment variables:
NODE_ENV=production
PORT=3001
PGHOST=vms-db.c9akciq32.us-east-1.rds.amazonaws.com
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=vms_prod_user
PGPASSWORD=f1e2d3c4b5a6z9y8x7w6v5u4t3s2r1q0
PGSSLMODE=require
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
ERP_API_KEY=your_actual_prod_erp_key_here

# 4. Start command: npm install && npm start
# 5. Deploy!
```

### 6. Test Production API

```bash
# Test health endpoint
curl https://your-production-backend.com/api/v1/health

# Test login
curl -X POST https://your-production-backend.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Should return JWT token
```

### 7. Seed Production Database (One-time)

```bash
# SSH into your production server or run via deployment platform CLI
cd /path/to/backend
NODE_ENV=production node src/seed.js
```

---

## Security Checklist Before Going Live

- [ ] All secrets are strong (30+ chars, random)
- [ ] Database credentials are NOT in Git
- [ ] JWT_SECRET is unique and production-only
- [ ] Database SSL is enabled (PGSSLMODE=require)
- [ ] Database user is NOT 'postgres'
- [ ] Database name is NOT 'vms' (use vms_prod)
- [ ] CORS is configured for production domain only
- [ ] API has rate limiting enabled
- [ ] Logging is configured (don't log passwords!)
- [ ] Database backups are enabled
- [ ] Error tracking is set up (Sentry, etc.)
- [ ] Health monitoring is enabled
- [ ] HTTPS is enabled on frontend and backend
- [ ] Old development keys/secrets are revoked
- [ ] Access logs are being monitored

---

## Post-Deployment Monitoring

```bash
# Monitor logs
journalctl -u vms-backend -f

# Check database connections
psql -h your-prod-host -U vms_prod_user -d vms_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor CPU/Memory
top
df -h
```

---

## Emergency: Reset Production Secrets

**If a secret is compromised:**

1. Generate new secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Update in secret manager:

   - AWS Secrets Manager
   - Render Environment Variables
   - Railway Variables
   - Your hosting platform

3. Restart application to use new secret

4. Invalidate all existing tokens (users need to re-login)

5. Audit logs for unauthorized access

---

## Deployment Platform Quick Links

- **Render**: https://render.com
- **Railway**: https://railway.app
- **Fly.io**: https://fly.io
- **Heroku**: https://heroku.com
- **AWS**: https://aws.amazon.com
- **DigitalOcean**: https://digitalocean.com

---

**Questions? Check PRODUCTION_ENV_SETUP_GUIDE.md for detailed explanations.**
