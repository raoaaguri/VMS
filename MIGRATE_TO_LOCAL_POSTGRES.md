# Migrate from Supabase to Local PostgreSQL

This guide will help you migrate all your data from Supabase to your local PostgreSQL database.

## Prerequisites

1. **PostgreSQL must be installed and running** on your local machine
   - Host: localhost
   - Port: 5432
   - Database: vms
   - User: postgres
   - Password: postgres

2. **Start PostgreSQL** (if not already running):
   ```bash
   # Linux
   sudo systemctl start postgresql

   # Mac (Homebrew)
   brew services start postgresql

   # Windows
   net start postgresql-x64-[version]
   ```

3. **Create the database** (if it doesn't exist):
   ```bash
   psql -U postgres -c "CREATE DATABASE vms;"
   ```

## Migration Steps

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Run the Migration Script

```bash
cd backend
npm run db:migrate-from-supabase
```

This script will:
- ✅ Connect to your local PostgreSQL database
- ✅ Drop any existing tables (clean slate)
- ✅ Create the complete database schema (vendors, users, purchase_orders, line_items, history tables)
- ✅ Fetch all data from your Supabase instance
- ✅ Import all data to your local PostgreSQL database
- ✅ Create indexes for performance
- ✅ Verify the data migration

### 3. Expected Output

You should see output similar to:

```
🔄 Migrating data from Supabase to Local PostgreSQL...

📡 Testing PostgreSQL connection...

✅ Connected to PostgreSQL

📋 Creating database schema...

✅ Schema created

📥 Fetching data from Supabase...

   Vendors: 5 records
   Users: 7 records
   Purchase Orders: 20 records
   Line Items: 45 records
   PO History: 12 records
   Line Item History: 8 records

💾 Importing data to local PostgreSQL...

   ✅ Imported 5 vendors
   ✅ Imported 7 users
   ✅ Imported 20 purchase orders
   ✅ Imported 45 line items
   ✅ Imported 12 PO history records
   ✅ Imported 8 line item history records

✅ Migration completed successfully!

📊 Final record counts:

   vendors: 5 records
   users: 7 records
   purchase_orders: 20 records
   purchase_order_line_items: 45 records
   po_history: 12 records
   po_line_item_history: 8 records

✨ All done!
```

## Troubleshooting

### Connection Refused Error

If you see `connect ECONNREFUSED 127.0.0.1:5432`, PostgreSQL is not running:

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (see Prerequisites section)
```

### Database Does Not Exist

If you see `database "vms" does not exist`:

```bash
psql -U postgres -c "CREATE DATABASE vms;"
```

### Authentication Failed

If you see authentication errors, make sure your PostgreSQL user/password match the `.env` file settings.

## Post-Migration

After successful migration:

1. Your local PostgreSQL database now contains all your Supabase data
2. The backend is already configured to use local PostgreSQL (see `.env` file)
3. You can start the backend server:
   ```bash
   cd backend
   npm start
   ```

## Database Schema

The migration creates the following tables:

- **vendors** - Vendor company information
- **users** - Admin and vendor user accounts
- **purchase_orders** - Purchase orders from ERP
- **purchase_order_line_items** - Line items for each PO
- **po_history** - Audit trail for PO status changes
- **po_line_item_history** - Audit trail for line item changes

All relationships, constraints, and indexes are preserved.
