# Migration from Supabase to Local PostgreSQL - Complete Guide

## Current Status: ✅ Code Ready for Migration

Your project is **well-prepared** for migration to local PostgreSQL. The codebase already has:
- ✅ All necessary database configuration for Postgres
- ✅ Postgres-compatible schema with no Supabase-specific features
- ✅ Environment variables structured for easy switching
- ✅ All SQL migrations ready to execute

---

## Data You Need to Provide / Prepare

### 1. **Local PostgreSQL Installation**
- PostgreSQL version 12+ installed on your Windows machine
- Port: 5432 (default) or custom port if in use
- Superuser access to create new databases and users

### 2. **Supabase Data Export** (If you have existing data)
You'll need to export data from your Supabase database:

**Option A: Using pgAdmin or psql**
```bash
# Export from Supabase to SQL dump
pg_dump -h <SUPABASE_HOST> -U postgres -d postgres > supabase_backup.sql
```

**Option B: Using Supabase Dashboard**
- Go to Supabase Dashboard → Settings → Backups
- Download the backup file

### 3. **Credentials Required for .env File**
Create/update your `.env` file in the backend folder with:

```
# PostgreSQL Connection (Local)
PGHOST=localhost
PGPORT=5432
PGDATABASE=vms_db
PGUSER=vms_user
PGPASSWORD=your_secure_password
PGSSLMODE=disable

# Keep these for now (won't be used after switch)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx

# JWT Secret (keep your existing one)
JWT_SECRET=vendor-management-secret-key-change-in-production

# ERP API Key
ERP_API_KEY=erp-api-key-change-in-production

# Node Environment
NODE_ENV=development
PORT=3001
```

---

## Step-by-Step Migration Process

### **Phase 1: Local PostgreSQL Setup** (Windows)

#### Step 1.1: Install PostgreSQL
1. Download PostgreSQL 15 from https://www.postgresql.org/download/windows/
2. Run the installer
3. Note the superuser password during installation
4. Keep default port 5432
5. Install pgAdmin (included in installer) - useful for management

#### Step 1.2: Create Database and User
Open Command Prompt or PowerShell:

```powershell
# Connect to PostgreSQL as superuser
psql -U postgres

# Then execute in psql:
CREATE DATABASE vms_db;
CREATE USER vms_user WITH PASSWORD 'your_secure_password';
ALTER ROLE vms_user SET client_encoding TO 'utf8';
ALTER ROLE vms_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE vms_user SET default_transaction_deferrable TO on;
ALTER ROLE vms_user SET default_transaction_level TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE vms_db TO vms_user;

# Exit psql
\q
```

---

### **Phase 2: Code Configuration Changes**

#### Step 2.1: Update Backend Configuration
1. **Current State**: Your `backend/src/config/db.js` uses Supabase client
2. **Required Change**: Switch to native PostgreSQL (pg or pg-pool library)

The backend already has PostgreSQL config ready in `env.js`, but the db.js needs updating.

---

### **Phase 3: Database Setup**

#### Step 3.1: Execute Migrations
Run migrations on your local PostgreSQL in order:

```powershell
# Using psql
psql -h localhost -U vms_user -d vms_db -f backend\src\migrations\20260108103405_create_vendor_management_schema.sql
psql -h localhost -U vms_user -d vms_db -f backend\src\migrations\20260108112638_fix_authentication_rls_policies.sql
psql -h localhost -U vms_user -d vms_db -f backend\src\migrations\20260109000000_add_history_tables.sql
psql -h localhost -U vms_user -d vms_db -f backend\src\migrations\20260109053815_add_approval_closure_history_features.sql
psql -h localhost -U vms_user -d vms_db -f backend\src\migrations\20260110000000_add_vendor_status_column.sql
```

**Note**: These migrations use auth-related RLS policies that won't work in local PostgreSQL (no built-in auth). You can:
- Keep them (will be ignored)
- Remove RLS policies for local development
- Keep RLS but handle authorization in the application layer

#### Step 3.2: Seed Initial Data (Optional)
```powershell
cd backend
npm run seed
```

---

### **Phase 4: Backend Code Updates**

Current database adapter needs changes:

**File to Update**: `backend/src/config/db.js`

Current implementation uses Supabase RPC. Need to switch to:
- **Option A**: Use `pg` library (simple)
- **Option B**: Use `pg-pool` library (better for production)

---

### **Phase 5: Import Existing Data** (If applicable)

If you have data in Supabase:

#### Step 5.1: Export from Supabase
```bash
pg_dump -h db.XXXXX.supabase.co -U postgres -d postgres --no-password > supabase_data.sql
```

#### Step 5.2: Import to Local
```bash
psql -h localhost -U vms_user -d vms_db < supabase_data.sql
```

---

### **Phase 6: Test Connection**

```powershell
# Test local PostgreSQL connection
psql -h localhost -U vms_user -d vms_db

# Should show:
# psql (15.x)
# Type "help" for help.
# vms_db=>

# Check tables created
\dt
```

---

## Database Tables Ready for Migration

Your schema includes:

| Table | Purpose | Records |
|-------|---------|---------|
| `vendors` | Vendor/supplier info | To be imported/created |
| `users` | Admin & vendor users | To be imported/created |
| `purchase_orders` | Purchase orders from ERP | To be imported/created |
| `purchase_order_line_items` | Line items for POs | To be imported/created |
| `po_history` | Change audit trail | To be imported/created |
| `po_line_item_history` | Line item changes | To be imported/created |

---

## Important Considerations

### ❌ Things That Will NOT Work the Same

1. **Row Level Security (RLS)** - Supabase RLS is JWT-based auth integration
   - Solution: Implement authorization in the application layer
   - Keep RLS policies but handle it through JWT in the API

2. **Real-time Subscriptions** - Supabase provides real-time updates
   - Solution: Use PostgreSQL LISTEN/NOTIFY or implement polling

3. **Authentication** - Current code uses `auth.uid()` in RLS policies
   - Solution: Your JWT middleware in the API already handles this

### ✅ Everything Else Works the Same

- All table structures
- All indexes
- All constraints
- All data types
- All functions and procedures (if any)

---

## Configuration Summary

### Environment Variables Needed

```
# Core PostgreSQL Connection
PGHOST=localhost                          (or your server IP)
PGPORT=5432                               (or your custom port)
PGDATABASE=vms_db                         (database name)
PGUSER=vms_user                           (database user)
PGPASSWORD=your_secure_password           (database user password)
PGSSLMODE=disable                         (for local dev; use 'require' for production)

# Application Settings
NODE_ENV=development
PORT=3001

# Authentication
JWT_SECRET=your_secret_key_here

# ERP Integration
ERP_API_KEY=your_erp_api_key
```

---

## Quick Start Checklist

- [ ] Install PostgreSQL 15+ on Windows
- [ ] Create `vms_db` database and `vms_user` user
- [ ] Create `.env` file in backend folder with credentials
- [ ] Run migration SQL files against local PostgreSQL
- [ ] Update `backend/src/config/db.js` to use `pg` library
- [ ] Install npm packages: `npm install pg` (if needed)
- [ ] Run `npm run dev` to test connection
- [ ] Import Supabase data backup (if applicable)
- [ ] Test API endpoints to verify data access

---

## Next Steps

Would you like me to:
1. **Update `db.js`** to use native PostgreSQL (pg library)?
2. **Create a PostgreSQL setup script** for Windows?
3. **Create a data export guide** from Supabase?
4. **Modify RLS policies** for local PostgreSQL?
5. **All of the above**?

Let me know which you'd like to proceed with first!
