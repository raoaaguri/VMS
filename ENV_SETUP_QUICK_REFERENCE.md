# Quick Environment Setup Reference

## TL;DR

### Local Development (No Changes Needed)

```bash
# Backend
cd backend
npm run dev
# Uses: backend/.env (localhost:5432)

# Frontend (in another terminal)
npm run dev
# Uses: .env (localhost:3001)
```

---

## For Production Deployment

### 1. Backend Production Setup

**Via Platform Dashboard (Recommended):**

```
NODE_ENV = production
PGHOST = your-database-host
PGPORT = 5432
PGDATABASE = vms_prod
PGUSER = database_user
PGPASSWORD = secure_password
PGSSLMODE = require
JWT_SECRET = random_strong_key_32_chars_min
ERP_API_KEY = your_erp_key
```

**Or use `.env.production` in deployment:**

```bash
# Set these values in .env.production before deploying
NODE_ENV=production
PGHOST=prod-db.example.com
PGPORT=5432
PGDATABASE=vms_prod
PGUSER=prod_user
PGPASSWORD=your_password
PGSSLMODE=require
JWT_SECRET=your_secret
ERP_API_KEY=your_key
```

### 2. Frontend Production Setup

**If backend is on different domain:**

```env
# .env.production
VITE_API_URL=https://api.yourdomain.com
VITE_USE_RELATIVE_API_URL=false
```

**If backend is on same domain:**

```env
# .env.production
VITE_USE_RELATIVE_API_URL=true
```

---

## Environment Variable Precedence

### Backend

1. System environment variables (platform settings)
2. `.env.production` file (if NODE_ENV=production)
3. `.env` file (if NODE_ENV=development)
4. Hardcoded defaults (only for dev)

### Frontend

1. Build-time environment variables
2. `.env.production` (during `npm run build` with NODE_ENV=production)
3. `.env` (default)

---

## Database Connection URLs

### Development

```
postgresql://postgres:root@localhost:5432/vms
```

### Production (Example)

```
postgresql://prod_user:password@prod-db.example.com:5432/vms_prod
```

---

## Build & Deploy Commands

```bash
# Backend Production Build
cd backend
npm run start

# Frontend Production Build
npm run build

# Frontend Preview
npm run preview
```

---

## Key Files Changed

| File                        | Purpose                        |
| --------------------------- | ------------------------------ |
| `backend/.env`              | Dev database config            |
| `backend/.env.example`      | Template for developers        |
| `backend/.env.production`   | Production database template   |
| `backend/src/config/env.js` | Loads config based on NODE_ENV |
| `.env`                      | Frontend dev API URL           |
| `.env.example`              | Frontend template              |
| `.env.production`           | Frontend prod API URL          |
| `src/config/api.js`         | Dynamic API URL resolver       |

---

## Verification

### Backend Config

```bash
cd backend
NODE_ENV=production npm run dev  # Should show config details
```

### Frontend API

```javascript
// In browser console
console.log(import.meta.env.VITE_API_URL);
```

---

## Security Reminders

⚠️ **NEVER commit `.env` files with secrets!**
⚠️ **Use strong passwords (16+ random chars)**
⚠️ **Keep JWT_SECRET secret**
⚠️ **Enable PGSSLMODE=require in production**

---

## Common Deployment Platforms

| Platform              | Env Variable Setup           |
| --------------------- | ---------------------------- |
| Heroku                | Dashboard → Config Vars      |
| AWS Elastic Beanstalk | .ebextensions or Console     |
| Railway               | Project Settings → Variables |
| Render                | Environment tab              |
| DigitalOcean App      | App Spec                     |
| Fly.io                | `flyctl secrets set`         |
| Docker                | `-e FLAG=value` at runtime   |

---

For detailed setup, see: [DYNAMIC_CONFIG_GUIDE.md](DYNAMIC_CONFIG_GUIDE.md)
