# 📊 Database Operations Guide - Complete Reference

## Table of Contents
1. [Database Overview](#database-overview)
2. [Table Structure](#table-structure)
3. [INSERT Operations](#insert-operations)
4. [UPDATE Operations](#update-operations)
5. [DELETE Operations](#delete-operations)
6. [Constraints & Relationships](#constraints--relationships)
7. [Example Queries](#example-queries)

---

## Database Overview

**Database Name:** vms  
**Type:** PostgreSQL (Local)  
**Host:** localhost  
**Port:** 5432  
**User:** postgres  

### Tables (6 total)
1. **vendors** - Vendor/supplier information
2. **users** - Admin and vendor users
3. **purchase_orders** - Purchase orders from ERP
4. **purchase_order_line_items** - Line items for POs
5. **po_history** - Audit trail for PO changes
6. **po_line_item_history** - Audit trail for line item changes

---

## Table Structure

### Table 1: vendors

**Purpose:** Store vendor/supplier information

**Schema:**
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

**Columns:**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| name | TEXT | NO | - | Vendor company name |
| code | TEXT | NO | - | Unique vendor code (e.g., ACME001) |
| contact_person | TEXT | NO | - | Primary contact name |
| contact_email | TEXT | NO | - | Contact email address |
| contact_phone | TEXT | YES | - | Contact phone number |
| address | TEXT | YES | - | Vendor address |
| gst_number | TEXT | YES | - | GST registration number |
| is_active | BOOLEAN | NO | true | Active/inactive flag |
| status | TEXT | NO | 'ACTIVE' | PENDING_APPROVAL, ACTIVE, or REJECTED |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |

**Constraints:**
- ✅ `id` is PRIMARY KEY (unique, not null)
- ✅ `code` is UNIQUE (no duplicate vendor codes)
- ✅ `status` CHECK constraint: Must be in ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED')
- ✅ `name`, `code`, `contact_person`, `contact_email` are NOT NULL

---

### Table 2: users

**Purpose:** Store admin and vendor user accounts

**Schema:**
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

**Columns:**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| name | TEXT | NO | - | User full name |
| email | TEXT | NO | - | Unique email address |
| password_hash | TEXT | NO | - | Bcrypt hashed password |
| role | TEXT | NO | - | ADMIN or VENDOR |
| vendor_id | UUID | YES | - | Foreign Key to vendors.id |
| is_active | BOOLEAN | NO | true | Active/inactive flag |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |

**Constraints:**
- ✅ `id` is PRIMARY KEY
- ✅ `email` is UNIQUE (no duplicate emails)
- ✅ `role` CHECK constraint: Must be 'ADMIN' or 'VENDOR'
- ✅ `vendor_id` FOREIGN KEY → vendors(id) ON DELETE SET NULL
- ✅ ADMIN users typically have `vendor_id = NULL`
- ✅ VENDOR users must have a `vendor_id`

---

### Table 3: purchase_orders

**Purpose:** Track purchase orders from ERP system

**Schema:**
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

**Columns:**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| po_number | TEXT | NO | - | Unique PO number (e.g., PO-2024-001) |
| po_date | DATE | NO | - | Purchase order date |
| priority | TEXT | NO | - | LOW, MEDIUM, HIGH, or URGENT |
| type | TEXT | NO | - | NEW_ITEMS or REPEAT |
| vendor_id | UUID | NO | - | Foreign Key to vendors.id |
| status | TEXT | NO | 'CREATED' | CREATED, ACCEPTED, PLANNED, or DELIVERED |
| closure_status | TEXT | NO | 'OPEN' | OPEN, PARTIALLY_CLOSED, or CLOSED |
| closed_amount | NUMERIC | NO | 0 | Amount closed/completed |
| closed_amount_currency | TEXT | NO | 'INR' | Currency of closed_amount |
| erp_reference_id | TEXT | YES | - | Reference to ERP system |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |

**Constraints:**
- ✅ `po_number` is UNIQUE
- ✅ `priority` CHECK: Must be in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
- ✅ `type` CHECK: Must be in ('NEW_ITEMS', 'REPEAT')
- ✅ `status` CHECK: Must be in ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')
- ✅ `closure_status` CHECK: Must be in ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED')
- ✅ `vendor_id` FOREIGN KEY → vendors(id) ON DELETE RESTRICT ⚠️ **Cannot delete vendor if POs exist**
- ✅ `closed_amount` >= 0

---

### Table 4: purchase_order_line_items

**Purpose:** Store individual line items for each purchase order

**Schema:**
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

**Columns:**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| po_id | UUID | NO | - | Foreign Key to purchase_orders.id |
| product_code | TEXT | NO | - | Product/SKU code |
| product_name | TEXT | NO | - | Product description |
| quantity | NUMERIC | NO | - | Order quantity (must be > 0) |
| gst_percent | NUMERIC | NO | - | GST percentage (0-100) |
| price | NUMERIC | NO | - | Unit price (must be >= 0) |
| mrp | NUMERIC | NO | - | Maximum Retail Price (must be >= 0) |
| line_priority | TEXT | NO | - | LOW, MEDIUM, HIGH, or URGENT |
| expected_delivery_date | DATE | YES | - | Expected delivery date |
| status | TEXT | NO | 'CREATED' | CREATED, ACCEPTED, PLANNED, or DELIVERED |
| created_at | TIMESTAMPTZ | NO | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | Last update timestamp |

**Constraints:**
- ✅ `po_id` FOREIGN KEY → purchase_orders(id) ON DELETE CASCADE ⚠️ **Deleting PO deletes all line items**
- ✅ `quantity` > 0 (must be positive)
- ✅ `gst_percent` >= 0
- ✅ `price` >= 0
- ✅ `mrp` >= 0
- ✅ `line_priority` CHECK: Must be in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
- ✅ `status` CHECK: Must be in ('CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED')

---

### Table 5: po_history

**Purpose:** Audit trail for purchase order changes

**Schema:**
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

**Columns:**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| po_id | UUID | NO | - | Foreign Key to purchase_orders.id |
| changed_by_user_id | UUID | YES | - | User who made the change |
| changed_by_role | TEXT | NO | - | Role of user (ADMIN or VENDOR) |
| action_type | TEXT | NO | - | Type of change (INSERT, UPDATE, DELETE) |
| field_name | TEXT | NO | - | Column name that changed |
| old_value | TEXT | YES | - | Previous value |
| new_value | TEXT | YES | - | New value |
| changed_at | TIMESTAMPTZ | NO | now() | Timestamp of change |

**Constraints:**
- ✅ `po_id` FOREIGN KEY → purchase_orders(id) ON DELETE CASCADE
- ✅ `changed_by_user_id` FOREIGN KEY → users(id) ON DELETE SET NULL (user may be deleted)

---

### Table 6: po_line_item_history

**Purpose:** Audit trail for line item changes

**Schema:**
```sql
CREATE TABLE po_line_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES purchase_order_line_items(id) ON DELETE CASCADE,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| po_id | UUID | NO | - | Foreign Key to purchase_orders.id |
| line_item_id | UUID | NO | - | Foreign Key to line_items.id |
| changed_by_user_id | UUID | YES | - | User who made change |
| changed_by_role | TEXT | NO | - | Role of user |
| action_type | TEXT | NO | - | Type of change |
| field_name | TEXT | NO | - | Column name that changed |
| old_value | TEXT | YES | - | Previous value |
| new_value | TEXT | YES | - | New value |
| changed_at | TIMESTAMPTZ | NO | now() | Timestamp of change |

**Constraints:**
- ✅ `po_id` FOREIGN KEY → purchase_orders(id) ON DELETE CASCADE
- ✅ `line_item_id` FOREIGN KEY → purchase_order_line_items(id) ON DELETE CASCADE

---

## INSERT Operations

### Inserting into vendors

**Example 1: Insert a new vendor**
```sql
INSERT INTO vendors (
  name,
  code,
  contact_person,
  contact_email,
  contact_phone,
  address,
  gst_number,
  status
) VALUES (
  'ABC Manufacturing Co',
  'ABC001',
  'John Smith',
  'john@abc.com',
  '+91-9876543210',
  '123 Industrial Park, Delhi',
  '07AADCR5055K1ZM',
  'PENDING_APPROVAL'
);
```

**Example 2: Insert vendor with minimum required fields**
```sql
INSERT INTO vendors (
  name,
  code,
  contact_person,
  contact_email
) VALUES (
  'XYZ Supplies',
  'XYZ002',
  'Jane Doe',
  'jane@xyz.com'
);
-- Note: is_active defaults to true, status defaults to 'ACTIVE'
```

**Constraints to Remember:**
- ⚠️ `code` must be UNIQUE (will fail if duplicate)
- ⚠️ `status` can only be: 'PENDING_APPROVAL', 'ACTIVE', or 'REJECTED'
- ✅ `name`, `code`, `contact_person`, `contact_email` are required
- ✅ `contact_phone`, `address`, `gst_number` are optional

---

### Inserting into users

**Example 1: Insert an admin user**
```sql
INSERT INTO users (
  name,
  email,
  password_hash,
  role,
  is_active
) VALUES (
  'Admin User',
  'admin@company.com',
  '$2b$10$...hashed_password_here...',
  'ADMIN',
  true
);
-- Note: vendor_id is NULL for admin users
```

**Example 2: Insert a vendor user (linked to vendor)**
```sql
INSERT INTO users (
  name,
  email,
  password_hash,
  role,
  vendor_id,
  is_active
) VALUES (
  'Vendor User',
  'vendor@abc.com',
  '$2b$10$...hashed_password_here...',
  'VENDOR',
  'uuid-of-abc-vendor',
  false  -- Usually starts as inactive until vendor is approved
);
```

**Constraints to Remember:**
- ⚠️ `email` must be UNIQUE (will fail if duplicate)
- ⚠️ `role` must be either 'ADMIN' or 'VENDOR'
- ⚠️ `vendor_id` must reference existing vendor (foreign key constraint)
- ⚠️ VENDOR users should have a non-null `vendor_id`
- ⚠️ ADMIN users should have `vendor_id = NULL`
- ✅ `name`, `email`, `password_hash`, `role` are required

**Important Note:** Use bcryptjs to hash passwords before inserting!
```javascript
import bcrypt from 'bcryptjs';
const passwordHash = await bcrypt.hash('plain-password', 10);
```

---

### Inserting into purchase_orders

**Example 1: Insert a new PO**
```sql
INSERT INTO purchase_orders (
  po_number,
  po_date,
  priority,
  type,
  vendor_id,
  status,
  erp_reference_id
) VALUES (
  'PO-2026-500',
  '2026-01-20',
  'HIGH',
  'NEW_ITEMS',
  'vendor-uuid-here',
  'CREATED',
  'ERP-REF-12345'
);
```

**Example 2: Insert PO with closure tracking**
```sql
INSERT INTO purchase_orders (
  po_number,
  po_date,
  priority,
  type,
  vendor_id,
  status,
  closure_status,
  closed_amount,
  closed_amount_currency
) VALUES (
  'PO-2026-501',
  '2026-01-20',
  'MEDIUM',
  'REPEAT',
  'vendor-uuid-here',
  'CREATED',
  'OPEN',
  0,
  'INR'
);
```

**Constraints to Remember:**
- ⚠️ `po_number` must be UNIQUE
- ⚠️ `priority` must be: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'
- ⚠️ `type` must be: 'NEW_ITEMS' or 'REPEAT'
- ⚠️ `status` must be: 'CREATED', 'ACCEPTED', 'PLANNED', or 'DELIVERED'
- ⚠️ `closure_status` must be: 'OPEN', 'PARTIALLY_CLOSED', or 'CLOSED'
- ⚠️ `vendor_id` must reference existing vendor
- ⚠️ `closed_amount` must be >= 0
- ✅ `po_number`, `po_date`, `priority`, `type`, `vendor_id` are required

---

### Inserting into purchase_order_line_items

**Example 1: Insert a line item**
```sql
INSERT INTO purchase_order_line_items (
  po_id,
  product_code,
  product_name,
  quantity,
  gst_percent,
  price,
  mrp,
  line_priority,
  expected_delivery_date,
  status
) VALUES (
  'po-uuid-here',
  'PROD-12345',
  'Electronic Component X',
  100,
  18,
  250.50,
  280.00,
  'HIGH',
  '2026-02-15',
  'CREATED'
);
```

**Example 2: Insert line item with minimum fields**
```sql
INSERT INTO purchase_order_line_items (
  po_id,
  product_code,
  product_name,
  quantity,
  gst_percent,
  price,
  mrp,
  line_priority
) VALUES (
  'po-uuid-here',
  'PROD-12346',
  'Component Y',
  50,
  12,
  150.00,
  170.00,
  'MEDIUM'
);
-- Note: expected_delivery_date is optional, status defaults to 'CREATED'
```

**Constraints to Remember:**
- ⚠️ `quantity` must be > 0
- ⚠️ `gst_percent` must be >= 0
- ⚠️ `price` must be >= 0
- ⚠️ `mrp` must be >= 0
- ⚠️ `line_priority` must be: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'
- ⚠️ `status` must be: 'CREATED', 'ACCEPTED', 'PLANNED', or 'DELIVERED'
- ⚠️ `po_id` must reference existing purchase order
- ✅ `po_id`, `product_code`, `product_name`, `quantity`, `gst_percent`, `price`, `mrp`, `line_priority` are required

---

### Inserting into po_history

**Example 1: Record a PO status change**
```sql
INSERT INTO po_history (
  po_id,
  changed_by_user_id,
  changed_by_role,
  action_type,
  field_name,
  old_value,
  new_value
) VALUES (
  'po-uuid-here',
  'user-uuid-here',
  'ADMIN',
  'UPDATE',
  'status',
  'CREATED',
  'ACCEPTED'
);
```

**Example 2: Record a PO insertion**
```sql
INSERT INTO po_history (
  po_id,
  changed_by_user_id,
  changed_by_role,
  action_type,
  field_name,
  new_value
) VALUES (
  'po-uuid-here',
  'user-uuid-here',
  'ADMIN',
  'INSERT',
  'po_number',
  'PO-2026-500'
);
```

**Constraints to Remember:**
- ⚠️ `po_id` must reference existing purchase order
- ⚠️ `changed_by_user_id` must reference existing user (or NULL)
- ✅ Typically inserted automatically by backend triggers/code

---

## UPDATE Operations

### Updating vendors

**Example 1: Approve a pending vendor**
```sql
UPDATE vendors
SET 
  status = 'ACTIVE',
  code = 'VND-ABC-00001',
  updated_at = now()
WHERE id = 'vendor-uuid-here' AND status = 'PENDING_APPROVAL';
```

**Example 2: Deactivate a vendor**
```sql
UPDATE vendors
SET 
  is_active = false,
  updated_at = now()
WHERE id = 'vendor-uuid-here';
```

**Example 3: Update vendor contact information**
```sql
UPDATE vendors
SET 
  contact_person = 'New Contact Name',
  contact_email = 'new.email@abc.com',
  contact_phone = '+91-9999999999',
  updated_at = now()
WHERE code = 'ABC001';
```

**Constraints While Updating:**
- ⚠️ Cannot change `code` to duplicate value (UNIQUE constraint)
- ⚠️ `status` can only be: 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED'
- ⚠️ `is_active` can be true or false
- ✅ Always update `updated_at` to track changes
- ✅ Suggest using WHERE clause to target specific vendor

**Important Caveat:**
- ⚠️ When changing `status` from 'ACTIVE' to 'REJECTED', also consider:
  - Setting `is_active = false`
  - Deactivating associated users
  - Rejecting pending POs

---

### Updating users

**Example 1: Activate a vendor user**
```sql
UPDATE users
SET 
  is_active = true,
  updated_at = now()
WHERE vendor_id = 'vendor-uuid-here' AND role = 'VENDOR';
```

**Example 2: Deactivate a user**
```sql
UPDATE users
SET 
  is_active = false,
  updated_at = now()
WHERE email = 'user@company.com';
```

**Example 3: Update password**
```sql
UPDATE users
SET 
  password_hash = '$2b$10$...new_hashed_password...',
  updated_at = now()
WHERE email = 'user@company.com';
```

**Constraints While Updating:**
- ⚠️ Cannot change `email` to duplicate value (UNIQUE constraint)
- ⚠️ Cannot change `role` to value other than 'ADMIN' or 'VENDOR'
- ⚠️ If changing `vendor_id`:
  - Must reference existing vendor
  - Only applicable for VENDOR role users
  - ADMIN users should have `vendor_id = NULL`
- ✅ Always hash password before updating `password_hash`
- ✅ Always update `updated_at`

---

### Updating purchase_orders

**Example 1: Accept a PO**
```sql
UPDATE purchase_orders
SET 
  status = 'ACCEPTED',
  updated_at = now()
WHERE po_number = 'PO-2026-500' AND status = 'CREATED';
```

**Example 2: Mark PO as delivered**
```sql
UPDATE purchase_orders
SET 
  status = 'DELIVERED',
  closure_status = 'CLOSED',
  updated_at = now()
WHERE po_number = 'PO-2026-500';
```

**Example 3: Update PO closure status**
```sql
UPDATE purchase_orders
SET 
  closure_status = 'PARTIALLY_CLOSED',
  closed_amount = 50000,
  updated_at = now()
WHERE id = 'po-uuid-here';
```

**Constraints While Updating:**
- ⚠️ `status` workflow: CREATED → ACCEPTED → PLANNED → DELIVERED
  - ⚠️ May be able to update `status` directly, but should follow workflow
  - ⚠️ Cannot go backwards (e.g., DELIVERED → ACCEPTED)
- ⚠️ `priority` must be: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'
- ⚠️ `type` cannot be changed after creation
- ⚠️ `vendor_id` cannot be changed (breaks data integrity)
- ⚠️ `po_number` cannot be changed (UNIQUE identifier)
- ⚠️ `closed_amount` must be >= 0
- ⚠️ `closed_amount` cannot exceed total PO amount
- ✅ Always update `updated_at`

**Status Workflow Notes:**
```
CREATED   → Initial state when PO is created
   ↓
ACCEPTED  → Vendor has acknowledged the PO
   ↓
PLANNED   → Items are being sourced/produced
   ↓
DELIVERED → Items have been delivered
```

---

### Updating purchase_order_line_items

**Example 1: Accept a line item**
```sql
UPDATE purchase_order_line_items
SET 
  status = 'ACCEPTED',
  updated_at = now()
WHERE po_id = 'po-uuid-here' AND product_code = 'PROD-12345';
```

**Example 2: Update delivery date**
```sql
UPDATE purchase_order_line_items
SET 
  expected_delivery_date = '2026-03-15',
  updated_at = now()
WHERE po_id = 'po-uuid-here' AND product_code = 'PROD-12345';
```

**Example 3: Update quantity and price**
```sql
UPDATE purchase_order_line_items
SET 
  quantity = 150,
  price = 240.00,
  updated_at = now()
WHERE id = 'line-item-uuid-here';
```

**Constraints While Updating:**
- ⚠️ `quantity` must be > 0
- ⚠️ `price` must be >= 0
- ⚠️ `mrp` must be >= 0
- ⚠️ `gst_percent` must be >= 0
- ⚠️ `line_priority` must be: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'
- ⚠️ `status` must be: 'CREATED', 'ACCEPTED', 'PLANNED', or 'DELIVERED'
- ⚠️ `po_id` cannot be changed (breaks relationship)
- ⚠️ Cannot update `po_id` (would break audit trail)
- ✅ Product codes can sometimes be updated (depends on business rules)
- ✅ Always update `updated_at`

---

## DELETE Operations

### Deleting from vendors

**Example 1: Delete a vendor (simple case)**
```sql
DELETE FROM vendors
WHERE id = 'vendor-uuid-here';
```

**⚠️ IMPORTANT CONSTRAINTS:**

**Cannot delete if:**
1. Vendor has associated users
   ```sql
   -- Check first:
   SELECT COUNT(*) FROM users WHERE vendor_id = 'vendor-uuid-here';
   ```

2. Vendor has associated purchase orders (ON DELETE RESTRICT)
   ```sql
   -- Check first:
   SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = 'vendor-uuid-here';
   ```

**Correct deletion sequence:**
```sql
-- Step 1: Delete all line items (cascades with PO)
-- Step 2: Delete all purchase orders
DELETE FROM purchase_orders WHERE vendor_id = 'vendor-uuid-here';

-- Step 3: Delete all users linked to vendor
DELETE FROM users WHERE vendor_id = 'vendor-uuid-here';

-- Step 4: Delete the vendor
DELETE FROM vendors WHERE id = 'vendor-uuid-here';
```

**Better approach (soft delete):**
```sql
-- Instead of deleting, just mark as inactive
UPDATE vendors
SET is_active = false
WHERE id = 'vendor-uuid-here';
```

---

### Deleting from users

**Example 1: Delete a user**
```sql
DELETE FROM users
WHERE id = 'user-uuid-here';
```

**⚠️ IMPORTANT NOTES:**

**No foreign key constraints preventing deletion**, but:
- ✅ Can delete admin users without issues
- ⚠️ Deleting vendor user makes that vendor lose a contact
- ⚠️ History records will have NULL `changed_by_user_id`

**Better approach (soft delete):**
```sql
-- Instead of deleting, just mark as inactive
UPDATE users
SET is_active = false
WHERE email = 'user@company.com';
```

---

### Deleting from purchase_orders

**Example 1: Delete a PO**
```sql
DELETE FROM purchase_orders
WHERE id = 'po-uuid-here';
```

**⚠️ CRITICAL CONSTRAINTS:**

**Cascading deletes:**
1. When you delete a PO:
   - ✅ All line items are deleted automatically (ON DELETE CASCADE)
   - ✅ All PO history records are deleted automatically
   - ✅ All line item history records are deleted automatically

2. When you try to delete a vendor:
   - ❌ It FAILS if PO exists (ON DELETE RESTRICT)
   - You must delete POs first!

**Deletion sequence for complete cleanup:**
```sql
-- Step 1: Delete line item history
DELETE FROM po_line_item_history WHERE po_id = 'po-uuid-here';

-- Step 2: Delete PO history
DELETE FROM po_history WHERE po_id = 'po-uuid-here';

-- Step 3: Delete line items
DELETE FROM purchase_order_line_items WHERE po_id = 'po-uuid-here';

-- Step 4: Delete PO (safer if manual cleanup)
DELETE FROM purchase_orders WHERE id = 'po-uuid-here';
```

**OR (simpler - cascades do the work):**
```sql
-- Delete PO - everything cascades automatically
DELETE FROM purchase_orders WHERE id = 'po-uuid-here';
```

**Better approach (soft delete):**
```sql
-- Instead of deleting, mark as rejected/cancelled
UPDATE purchase_orders
SET status = 'CANCELLED'  -- If you add this status
WHERE id = 'po-uuid-here';
```

---

### Deleting from purchase_order_line_items

**Example 1: Delete a line item**
```sql
DELETE FROM purchase_order_line_items
WHERE id = 'line-item-uuid-here';
```

**⚠️ IMPORTANT CONSTRAINTS:**

**Cascading deletes:**
- When you delete a line item:
  - ✅ Associated history records are deleted automatically

**No constraints on the deletion itself**, but be aware:
- ✅ Line item history is preserved (via cascade)
- ⚠️ Cannot undo the deletion (use soft delete for audit trail)

**Better approach (soft delete with status):**
```sql
-- Instead of deleting, mark as cancelled/rejected
UPDATE purchase_order_line_items
SET status = 'REJECTED'  -- If status changed
WHERE id = 'line-item-uuid-here';
```

---

### Deleting from history tables

**⚠️ GENERALLY NOT RECOMMENDED**

```sql
-- Delete PO history for specific PO
DELETE FROM po_history
WHERE po_id = 'po-uuid-here';

-- Delete all line item history
DELETE FROM po_line_item_history
WHERE po_id = 'po-uuid-here';
```

**Why not delete history?**
- ❌ Breaks audit trail
- ❌ Removes compliance records
- ❌ Makes debugging impossible
- ✅ Better to archive to separate table

---

## Constraints & Relationships

### Table Relationships

```
vendors (1) ──[0..*]── users
   │
   ├──[1..*]── purchase_orders
   │                │
   │                ├──[0..*]── po_history
   │                │
   │                └──[1..*]── purchase_order_line_items
   │                                 │
   │                                 ├──[0..*]── po_line_item_history
```

### Foreign Key Constraints

| Reference | Constraint | Behavior |
|-----------|-----------|----------|
| users.vendor_id → vendors.id | FK | ON DELETE SET NULL |
| purchase_orders.vendor_id → vendors.id | FK | ON DELETE RESTRICT ⚠️ |
| purchase_order_line_items.po_id → purchase_orders.id | FK | ON DELETE CASCADE ✅ |
| po_history.po_id → purchase_orders.id | FK | ON DELETE CASCADE |
| po_history.changed_by_user_id → users.id | FK | ON DELETE SET NULL |
| po_line_item_history.po_id → purchase_orders.id | FK | ON DELETE CASCADE |
| po_line_item_history.line_item_id → purchase_order_line_items.id | FK | ON DELETE CASCADE |
| po_line_item_history.changed_by_user_id → users.id | FK | ON DELETE SET NULL |

### Unique Constraints

| Column | Table | Rule |
|--------|-------|------|
| code | vendors | UNIQUE |
| email | users | UNIQUE |
| po_number | purchase_orders | UNIQUE |

### Check Constraints

| Column | Table | Valid Values |
|--------|-------|--------------|
| role | users | 'ADMIN', 'VENDOR' |
| status | vendors | 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED' |
| priority | purchase_orders | 'LOW', 'MEDIUM', 'HIGH', 'URGENT' |
| type | purchase_orders | 'NEW_ITEMS', 'REPEAT' |
| status | purchase_orders | 'CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED' |
| closure_status | purchase_orders | 'OPEN', 'PARTIALLY_CLOSED', 'CLOSED' |
| line_priority | purchase_order_line_items | 'LOW', 'MEDIUM', 'HIGH', 'URGENT' |
| status | purchase_order_line_items | 'CREATED', 'ACCEPTED', 'PLANNED', 'DELIVERED' |
| quantity | purchase_order_line_items | > 0 |
| gst_percent | purchase_order_line_items | >= 0 |
| price | purchase_order_line_items | >= 0 |
| mrp | purchase_order_line_items | >= 0 |
| closed_amount | purchase_orders | >= 0 |

### Not Null Constraints

| Column | Table | Nullable |
|--------|-------|----------|
| name | vendors | NO |
| code | vendors | NO |
| contact_person | vendors | NO |
| contact_email | vendors | NO |
| status | vendors | NO |
| name | users | NO |
| email | users | NO |
| password_hash | users | NO |
| role | users | NO |
| po_number | purchase_orders | NO |
| po_date | purchase_orders | NO |
| priority | purchase_orders | NO |
| type | purchase_orders | NO |
| vendor_id | purchase_orders | NO |
| status | purchase_orders | NO |
| closure_status | purchase_orders | NO |
| closed_amount | purchase_orders | NO |
| po_id | purchase_order_line_items | NO |
| product_code | purchase_order_line_items | NO |
| product_name | purchase_order_line_items | NO |
| quantity | purchase_order_line_items | NO |
| gst_percent | purchase_order_line_items | NO |
| price | purchase_order_line_items | NO |
| mrp | purchase_order_line_items | NO |
| line_priority | purchase_order_line_items | NO |
| status | purchase_order_line_items | NO |

---

## Example Queries

### Complete INSERT example with all validations

```javascript
// Backend code example
import bcrypt from 'bcryptjs';
import { getDbClient } from './db.js';

async function createVendorWithUser() {
  const db = getDbClient();
  
  try {
    // Step 1: Insert vendor
    const vendorResult = await db.from('vendors').insert({
      name: 'Tech Supplies Co',
      code: 'TECH-001',
      contact_person: 'Mr. Tech',
      contact_email: 'contact@techsupplies.com',
      contact_phone: '+91-9876543210',
      address: 'Tech Park, Bangalore',
      gst_number: '27AABCA1234F1Z0',
      status: 'PENDING_APPROVAL',
      is_active: false
    });
    
    const vendorId = vendorResult.data[0].id;
    console.log('Vendor created:', vendorId);
    
    // Step 2: Hash password
    const passwordHash = await bcrypt.hash('initialPassword123', 10);
    
    // Step 3: Insert vendor user
    const userResult = await db.from('users').insert({
      name: 'Tech User',
      email: 'user@techsupplies.com',
      password_hash: passwordHash,
      role: 'VENDOR',
      vendor_id: vendorId,
      is_active: false  // Inactive until vendor approved
    });
    
    console.log('User created:', userResult.data[0].id);
    
    // Step 4: Insert purchase order
    const poResult = await db.from('purchase_orders').insert({
      po_number: 'PO-2026-1001',
      po_date: new Date().toISOString().split('T')[0],
      priority: 'HIGH',
      type: 'NEW_ITEMS',
      vendor_id: vendorId,
      status: 'CREATED',
      closure_status: 'OPEN'
    });
    
    const poId = poResult.data[0].id;
    console.log('PO created:', poId);
    
    // Step 5: Insert line items
    const lineItemResult = await db.from('purchase_order_line_items').insert({
      po_id: poId,
      product_code: 'PROD-2026-001',
      product_name: 'Electronic Component',
      quantity: 100,
      gst_percent: 18,
      price: 500.00,
      mrp: 600.00,
      line_priority: 'HIGH',
      expected_delivery_date: '2026-02-20',
      status: 'CREATED'
    });
    
    console.log('Line item created:', lineItemResult.data[0].id);
    
    return { vendorId, userId: userResult.data[0].id, poId };
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}
```

### Complete UPDATE example with validations

```javascript
async function updateVendorStatus(vendorId, newStatus) {
  const db = getDbClient();
  
  try {
    // Validate status
    const validStatuses = ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    
    // Update vendor
    const result = await db.from('vendors')
      .eq('id', vendorId)
      .update({
        status: newStatus,
        is_active: newStatus === 'ACTIVE',
        updated_at: new Date().toISOString()
      });
    
    // Update associated users
    if (newStatus === 'ACTIVE') {
      await db.from('users')
        .eq('vendor_id', vendorId)
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        });
    } else if (newStatus === 'REJECTED') {
      await db.from('users')
        .eq('vendor_id', vendorId)
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        });
    }
    
    console.log('Vendor and users updated');
    return result;
    
  } catch (error) {
    console.error('Error updating vendor:', error.message);
    throw error;
  }
}
```

### Safe DELETE example

```javascript
async function safeDeletePO(poId) {
  const db = getDbClient();
  
  try {
    // Step 1: Check if PO exists
    const po = await db.from('purchase_orders')
      .eq('id', poId)
      .select();
    
    if (po.data.length === 0) {
      throw new Error('PO not found');
    }
    
    // Step 2: Log deletion in history
    await db.from('po_history').insert({
      po_id: poId,
      changed_by_user_id: 'admin-user-id',
      changed_by_role: 'ADMIN',
      action_type: 'DELETE',
      field_name: 'po_number',
      old_value: po.data[0].po_number
    });
    
    // Step 3: Delete the PO (cascades delete line items and history)
    await db.from('purchase_orders')
      .eq('id', poId)
      .delete();
    
    console.log('PO deleted successfully');
    
  } catch (error) {
    console.error('Error deleting PO:', error.message);
    throw error;
  }
}
```

---

## Summary Table

| Operation | Table | Cautions | Recommended |
|-----------|-------|----------|------------|
| INSERT | vendors | Check code uniqueness | Use bcrypt for any secrets |
| INSERT | users | Hash password, check email uniqueness | Always hash passwords |
| INSERT | purchase_orders | Check vendor exists | Validate status workflow |
| INSERT | line_items | Check PO exists, quantities > 0 | Validate numeric constraints |
| UPDATE | vendors | Cannot change code to duplicate | Use soft delete instead |
| UPDATE | users | Cannot change email to duplicate | Update updated_at always |
| UPDATE | PO | Follow status workflow | Use soft delete instead |
| UPDATE | line_items | Validate numerics | Update updated_at always |
| DELETE | vendors | Will fail if POs exist | Use soft delete instead |
| DELETE | users | Marks history as NULL | Use soft delete instead |
| DELETE | PO | Cascades delete line items | Use soft delete instead |
| DELETE | line_items | Safe, cascades history | Use soft delete instead |

---

## Connection Details

**Local Development:**
```
Host: localhost
Port: 5432
Database: vms
User: postgres
Password: postgres
SSL: false
```

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/vms
```

**Node.js Connection (pg module):**
```javascript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'vms'
});

const client = await pool.connect();
const result = await client.query('SELECT * FROM vendors');
client.release();
```

This comprehensive guide covers all database operations, constraints, and best practices for your VMS system!
