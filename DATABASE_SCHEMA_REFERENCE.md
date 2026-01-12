# 📊 Database Schema Reference

## Complete Database Structure

Your local PostgreSQL database is now fully set up with the following schema:

---

## Table: vendors

**Purpose:** Store vendor/supplier information

```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Sample Data:**
```
- ACME001: Acme Corporation (ACTIVE)
- GLOB001: Global Supplies Inc (ACTIVE)
```

---

## Table: users

**Purpose:** Store admin and vendor user accounts

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'VENDOR')),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Sample Data:**
```
1. admin@example.com (ADMIN) - Admin User
2. vendor@acme.com (VENDOR) - John Doe (linked to ACME001)
```

---

## Table: purchase_orders

**Purpose:** Track purchase orders from ERP system

```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  po_date DATE NOT NULL,
  priority TEXT NOT NULL
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  type TEXT NOT NULL
    CHECK (type IN ('NEW_ITEMS', 'REPEAT')),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')),
  closure_status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (closure_status IN ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED')),
  closed_amount NUMERIC DEFAULT 0 CHECK (closed_amount >= 0),
  closed_amount_currency TEXT DEFAULT 'INR',
  erp_reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Sample Data:**
```
1. PO-2024-001 (ACME001) - HIGH priority, NEW_ITEMS, CREATED
2. PO-2024-002 (ACME001) - MEDIUM priority, REPEAT, CREATED
```

---

## Table: purchase_order_line_items

**Purpose:** Store individual line items for each purchase order

```sql
CREATE TABLE purchase_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  gst_percent NUMERIC NOT NULL CHECK (gst_percent >= 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  mrp NUMERIC NOT NULL CHECK (mrp >= 0),
  line_priority TEXT NOT NULL
    CHECK (line_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  expected_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Sample Data:**
```
PO-2024-001 Line Items:
  - PROD-001: Widget A (qty: 100, price: 25.50, gst: 18%)
  - PROD-002: Widget B (qty: 50, price: 45.00, gst: 18%)

PO-2024-002 Line Items:
  - PROD-003: Gadget X (qty: 200, price: 15.00, gst: 12%)
```

---

## Table: po_history

**Purpose:** Audit trail for purchase order changes

```sql
CREATE TABLE po_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Track who changed what, when, and why for POs

---

## Table: po_line_item_history

**Purpose:** Audit trail for line item changes

```sql
CREATE TABLE po_line_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES purchase_order_line_items(id)
    ON DELETE CASCADE,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose:** Track changes to individual line items

---

## Indexes Created

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_vendor_id ON users(vendor_id);
CREATE INDEX idx_vendors_code ON vendors(code);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_order_line_items_po_id 
  ON purchase_order_line_items(po_id);
CREATE INDEX idx_po_history_po_id ON po_history(po_id);
CREATE INDEX idx_po_history_changed_at ON po_history(changed_at);
CREATE INDEX idx_po_line_item_history_po_id ON po_line_item_history(po_id);
CREATE INDEX idx_po_line_item_history_line_item_id 
  ON po_line_item_history(line_item_id);
CREATE INDEX idx_po_line_item_history_changed_at 
  ON po_line_item_history(changed_at);
```

---

## Relationships

```
vendors (1) ──────────────────── (M) users
  │
  └──────────────────────────── (M) purchase_orders
                                      │
                                      └─────────── (M) purchase_order_line_items
                                      │
                                      └─────────── (M) po_history
                                           │
                                           └─────── (M) po_line_item_history
```

---

## Data Access Examples

### Query All Vendors
```sql
SELECT * FROM vendors WHERE is_active = true;
```

### Get POs for a Vendor
```sql
SELECT po.* FROM purchase_orders po
WHERE po.vendor_id = (SELECT id FROM vendors WHERE code = 'ACME001');
```

### Get Line Items for a PO
```sql
SELECT * FROM purchase_order_line_items 
WHERE po_id = (SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001');
```

### Get PO History
```sql
SELECT * FROM po_history 
WHERE po_id = (SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001')
ORDER BY changed_at DESC;
```

### Get All Users for a Vendor
```sql
SELECT * FROM users 
WHERE vendor_id = (SELECT id FROM vendors WHERE code = 'ACME001');
```

---

## Data Types Used

| Type | Usage | Examples |
|------|-------|----------|
| UUID | Primary keys, Foreign keys | id, po_id, vendor_id |
| TEXT | Text fields | name, email, product_name |
| DATE | Date fields | po_date, expected_delivery_date |
| NUMERIC | Currency/quantities | price, quantity, closed_amount |
| TIMESTAMPTZ | Timestamps | created_at, updated_at, changed_at |
| BOOLEAN | True/False | is_active |

---

## Constraints

| Type | Applied To | Rule |
|------|-----------|------|
| PRIMARY KEY | All tables (id) | Unique identifier |
| UNIQUE | vendors(code), users(email), purchase_orders(po_number) | No duplicates |
| FOREIGN KEY | vendor_id, po_id, user_id | Referential integrity |
| CHECK | Enum fields | Limited valid values |
| NOT NULL | Key fields | Required data |
| DEFAULT | Dates, status, flags | Automatic values |

---

## Current Record Counts

```sql
SELECT 'vendors' as table_name, count(*) FROM vendors
UNION ALL
SELECT 'users', count(*) FROM users
UNION ALL
SELECT 'purchase_orders', count(*) FROM purchase_orders
UNION ALL
SELECT 'purchase_order_line_items', count(*) FROM purchase_order_line_items
UNION ALL
SELECT 'po_history', count(*) FROM po_history
UNION ALL
SELECT 'po_line_item_history', count(*) FROM po_line_item_history;
```

**Current Results:**
```
vendors                        | 2
users                          | 4
purchase_orders                | 3
purchase_order_line_items      | 6
po_history                     | 0
po_line_item_history           | 0
```

---

## Connection Details

```
Host:     localhost
Port:     5432
Database: vms
User:     postgres
Password: postgres
SSL:      false (local development)
```

---

## Backup & Restore

### Backup Database
```bash
pg_dump -h localhost -U postgres -d vms > backup.sql
```

### Restore Database
```bash
psql -h localhost -U postgres -d vms < backup.sql
```

### Backup Specific Table
```bash
pg_dump -h localhost -U postgres -d vms -t vendors > vendors_backup.sql
```

---

**Last Updated:** January 12, 2026

For more information, see:
- [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)
- [START_HERE.md](START_HERE.md)
- [QUICK_START.md](QUICK_START.md)
