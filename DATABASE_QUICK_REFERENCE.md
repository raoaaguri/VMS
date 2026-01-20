# 📋 Database Quick Reference - Practical Examples

## Quick Navigation
- [Common INSERT Queries](#common-insert-queries)
- [Common UPDATE Queries](#common-update-queries)
- [Common DELETE Queries](#common-delete-queries)
- [Query Patterns](#query-patterns)
- [Common Errors & Solutions](#common-errors--solutions)

---

## Common INSERT Queries

### 1. Create New Vendor

```sql
-- Insert a new vendor
INSERT INTO vendors (name, code, contact_person, contact_email, contact_phone, address, gst_number, status)
VALUES (
  'Acme Corporation',
  'ACME-001',
  'John Smith',
  'john@acme.com',
  '+91-9876543210',
  '123 Industrial Park, Delhi',
  '07AADCR5055K1ZM',
  'PENDING_APPROVAL'
);
```

**Result:** Vendor created with PENDING_APPROVAL status and is_active=true

### 2. Create Admin User

```sql
-- Insert admin user (note: vendor_id is NULL)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
  'Admin User',
  'admin@company.com',
  '$2b$10$4eK8J7K8J7K8J7K8J7K8JexampleHashedPassword',
  'ADMIN',
  true
);
```

**Result:** Admin user created, can access all vendors

### 3. Create Vendor User (Linked to Vendor)

```sql
-- Insert vendor user - must reference existing vendor
INSERT INTO users (name, email, password_hash, role, vendor_id, is_active)
VALUES (
  'John Doe',
  'john@acme.com',
  '$2b$10$4eK8J7K8J7K8J7K8J7K8JexampleHashedPassword',
  'VENDOR',
  'a1b2c3d4-e5f6-4789-abcd-ef1234567890',  -- UUID of vendor
  false  -- Inactive until vendor is approved
);
```

**Result:** Vendor user created, linked to vendor, initially inactive

### 4. Create Purchase Order

```sql
-- Insert a new PO
INSERT INTO purchase_orders (po_number, po_date, priority, type, vendor_id, status, erp_reference_id)
VALUES (
  'PO-2026-001',
  '2026-01-20',
  'HIGH',
  'NEW_ITEMS',
  'a1b2c3d4-e5f6-4789-abcd-ef1234567890',  -- Vendor UUID
  'CREATED',
  'ERP-REF-12345'
);
```

**Result:** PO created with CREATED status and OPEN closure_status

### 5. Create Purchase Order Line Item

```sql
-- Insert line item for a PO
INSERT INTO purchase_order_line_items (po_id, product_code, product_name, quantity, gst_percent, price, mrp, line_priority, expected_delivery_date)
VALUES (
  'b2c3d4e5-f6a7-4890-abcd-ef1234567891',  -- PO UUID
  'PROD-001',
  'Electronic Component',
  100,
  18,
  250.50,
  280.00,
  'HIGH',
  '2026-02-15'
);
```

**Result:** Line item created, linked to PO, status = CREATED

### 6. Multiple Line Items in One Query

```sql
-- Insert multiple line items at once
INSERT INTO purchase_order_line_items (po_id, product_code, product_name, quantity, gst_percent, price, mrp, line_priority)
VALUES 
  ('b2c3d4e5-f6a7-4890-abcd-ef1234567891', 'PROD-001', 'Component A', 100, 18, 250.50, 280.00, 'HIGH'),
  ('b2c3d4e5-f6a7-4890-abcd-ef1234567891', 'PROD-002', 'Component B', 50, 12, 450.00, 500.00, 'MEDIUM'),
  ('b2c3d4e5-f6a7-4890-abcd-ef1234567891', 'PROD-003', 'Component C', 200, 5, 100.00, 150.00, 'LOW');
```

**Result:** 3 line items created in one operation

### 7. Log PO Change to History

```sql
-- Record a PO status change
INSERT INTO po_history (po_id, changed_by_user_id, changed_by_role, action_type, field_name, old_value, new_value)
VALUES (
  'b2c3d4e5-f6a7-4890-abcd-ef1234567891',
  'c3d4e5f6-a7b8-4901-bcde-f12345678902',  -- User UUID
  'ADMIN',
  'UPDATE',
  'status',
  'CREATED',
  'ACCEPTED'
);
```

**Result:** History entry created for audit trail

---

## Common UPDATE Queries

### 1. Approve Pending Vendor

```sql
-- Approve a vendor
UPDATE vendors
SET 
  status = 'ACTIVE',
  is_active = true,
  updated_at = now()
WHERE id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' AND status = 'PENDING_APPROVAL';
```

**Result:** Vendor status changes to ACTIVE

**Also run:**
```sql
-- Activate vendor users
UPDATE users
SET 
  is_active = true,
  updated_at = now()
WHERE vendor_id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' AND role = 'VENDOR';
```

### 2. Reject a Vendor

```sql
-- Reject a vendor
UPDATE vendors
SET 
  status = 'REJECTED',
  is_active = false,
  updated_at = now()
WHERE id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
```

**Result:** Vendor marked as rejected and inactive

**Also run:**
```sql
-- Deactivate vendor users
UPDATE users
SET 
  is_active = false,
  updated_at = now()
WHERE vendor_id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' AND role = 'VENDOR';
```

### 3. Accept a PO

```sql
-- Accept a PO
UPDATE purchase_orders
SET 
  status = 'ACCEPTED',
  updated_at = now()
WHERE po_number = 'PO-2026-001' AND status = 'CREATED';
```

**Result:** PO moves from CREATED to ACCEPTED status

### 4. Mark PO as Delivered

```sql
-- Mark PO as delivered
UPDATE purchase_orders
SET 
  status = 'DELIVERED',
  closure_status = 'CLOSED',
  updated_at = now()
WHERE po_number = 'PO-2026-001';
```

**Result:** PO is marked complete

### 5. Update PO Closure Status

```sql
-- Partially close a PO
UPDATE purchase_orders
SET 
  closure_status = 'PARTIALLY_CLOSED',
  closed_amount = 50000.00,
  closed_amount_currency = 'INR',
  updated_at = now()
WHERE po_number = 'PO-2026-001';
```

**Result:** Tracks partial fulfillment

### 6. Update Line Item Status

```sql
-- Accept a line item
UPDATE purchase_order_line_items
SET 
  status = 'ACCEPTED',
  updated_at = now()
WHERE po_id = 'b2c3d4e5-f6a7-4890-abcd-ef1234567891' AND product_code = 'PROD-001';
```

**Result:** Line item status changed

### 7. Update Vendor Contact Info

```sql
-- Update vendor contact information
UPDATE vendors
SET 
  contact_person = 'New Contact',
  contact_email = 'new.contact@acme.com',
  contact_phone = '+91-9999999999',
  updated_at = now()
WHERE code = 'ACME-001';
```

**Result:** Contact details updated

### 8. Change User Password

```sql
-- Update user password (must be hashed first!)
UPDATE users
SET 
  password_hash = '$2b$10$NewHashedPasswordHere',
  updated_at = now()
WHERE email = 'john@acme.com';
```

**Result:** Password changed

### 9. Deactivate User

```sql
-- Deactivate a user
UPDATE users
SET 
  is_active = false,
  updated_at = now()
WHERE email = 'john@acme.com';
```

**Result:** User cannot login

### 10. Bulk Update - All POs for a Vendor

```sql
-- Update all pending POs for a vendor
UPDATE purchase_orders
SET 
  status = 'PLANNED',
  updated_at = now()
WHERE vendor_id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' AND status = 'ACCEPTED';
```

**Result:** All accepted POs moved to PLANNED status

---

## Common DELETE Queries

### ⚠️ IMPORTANT: Use Soft Delete (UPDATE) instead of DELETE when possible!

### 1. Soft Delete - Vendor (Recommended)

```sql
-- Instead of DELETE, mark as inactive
UPDATE vendors
SET 
  is_active = false,
  updated_at = now()
WHERE id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
```

**Benefits:** Keeps audit trail, historical data intact

### 2. Soft Delete - User (Recommended)

```sql
-- Instead of DELETE, mark as inactive
UPDATE users
SET 
  is_active = false,
  updated_at = now()
WHERE email = 'john@acme.com';
```

**Benefits:** Keeps user history, login attempts intact

### 3. Soft Delete - PO (Recommended)

```sql
-- Mark PO as cancelled instead of deleting
UPDATE purchase_orders
SET 
  status = 'CANCELLED',  -- If you add this status
  updated_at = now()
WHERE po_number = 'PO-2026-001';
```

**Benefits:** Keeps financial records, history intact

### 4. Hard Delete - Single PO (Use with Caution!)

```sql
-- DELETE a PO (cascades delete line items and history)
-- This will DELETE associated line items and histories!
DELETE FROM purchase_orders
WHERE po_number = 'PO-2026-001';
```

**⚠️ Warning:** This cascades! All line items and history records are deleted!

### 5. Hard Delete - Line Item (Use with Caution!)

```sql
-- DELETE a single line item
DELETE FROM purchase_order_line_items
WHERE id = 'line-item-uuid';
```

**⚠️ Warning:** Be sure you really want to delete this!

### 6. Safe Deletion Sequence (if you must hard delete)

```sql
-- Step 1: Check what will be deleted
SELECT * FROM purchase_order_line_items WHERE po_id = 'po-uuid';
SELECT * FROM po_history WHERE po_id = 'po-uuid';
SELECT * FROM po_line_item_history WHERE po_id = 'po-uuid';

-- Step 2: Delete line items first
DELETE FROM purchase_order_line_items WHERE po_id = 'po-uuid';

-- Step 3: Delete history
DELETE FROM po_history WHERE po_id = 'po-uuid';
DELETE FROM po_line_item_history WHERE po_id = 'po-uuid';

-- Step 4: Delete the PO
DELETE FROM purchase_orders WHERE id = 'po-uuid';
```

**OR Simply:**
```sql
-- Just delete the PO - cascades handle the rest
DELETE FROM purchase_orders WHERE id = 'po-uuid';
```

---

## Query Patterns

### Get All Active Vendors

```sql
SELECT * FROM vendors 
WHERE is_active = true AND status = 'ACTIVE'
ORDER BY name;
```

### Get All Users for a Vendor

```sql
SELECT u.* FROM users u
WHERE u.vendor_id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'
  AND u.role = 'VENDOR'
  AND u.is_active = true;
```

### Get All POs for a Vendor with Line Items Count

```sql
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.priority,
  COUNT(poli.id) as line_item_count,
  v.name as vendor_name
FROM purchase_orders po
LEFT JOIN purchase_order_line_items poli ON po.id = poli.po_id
LEFT JOIN vendors v ON po.vendor_id = v.id
WHERE po.vendor_id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'
GROUP BY po.id, v.name
ORDER BY po.po_date DESC;
```

### Get PO with All Line Items

```sql
SELECT 
  po.*,
  poli.*
FROM purchase_orders po
LEFT JOIN purchase_order_line_items poli ON po.id = poli.po_id
WHERE po.po_number = 'PO-2026-001'
ORDER BY poli.created_at;
```

### Get PO Change History

```sql
SELECT * FROM po_history
WHERE po_id = 'b2c3d4e5-f6a7-4890-abcd-ef1234567891'
ORDER BY changed_at DESC;
```

### Find Pending Vendors

```sql
SELECT * FROM vendors
WHERE status = 'PENDING_APPROVAL'
ORDER BY created_at ASC;
```

### Find Inactive Users

```sql
SELECT * FROM users
WHERE is_active = false
ORDER BY updated_at DESC;
```

### Get POs by Status

```sql
SELECT po_number, status, vendor_id, po_date
FROM purchase_orders
WHERE status IN ('CREATED', 'ACCEPTED')
ORDER BY po_date DESC;
```

### Get High Priority Items

```sql
SELECT 
  poli.product_name,
  poli.quantity,
  po.po_number,
  po.priority
FROM purchase_order_line_items poli
JOIN purchase_orders po ON poli.po_id = po.id
WHERE poli.line_priority = 'URGENT' OR po.priority = 'URGENT'
ORDER BY po.po_date DESC;
```

### Count Stats

```sql
SELECT 
  'vendors' as table_name, COUNT(*) as count FROM vendors
UNION ALL
SELECT 'vendors_active', COUNT(*) FROM vendors WHERE is_active = true AND status = 'ACTIVE'
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'users_active', COUNT(*) FROM users WHERE is_active = true
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'purchase_order_line_items', COUNT(*) FROM purchase_order_line_items
ORDER BY table_name;
```

---

## Common Errors & Solutions

### Error 1: "duplicate key value violates unique constraint"

**Problem:**
```sql
INSERT INTO vendors (name, code, ...) 
VALUES ('Company', 'ACME-001', ...);
-- ERROR: duplicate key value violates unique constraint "vendors_code_key"
```

**Cause:** Vendor code 'ACME-001' already exists

**Solution:**
```sql
-- Check existing code
SELECT code FROM vendors WHERE code = 'ACME-001';

-- Use different code
INSERT INTO vendors (..., code, ...)
VALUES (..., 'ACME-002', ...);
```

---

### Error 2: "violates foreign key constraint"

**Problem:**
```sql
INSERT INTO users (vendor_id, ...) 
VALUES ('invalid-uuid', ...);
-- ERROR: insert or update on table "users" violates foreign key constraint
```

**Cause:** vendor_id doesn't exist

**Solution:**
```sql
-- Check vendor exists first
SELECT id FROM vendors WHERE id = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';

-- Use correct UUID
INSERT INTO users (vendor_id, ...) 
VALUES ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', ...);
```

---

### Error 3: "new row for relation violates check constraint"

**Problem:**
```sql
UPDATE purchase_orders SET status = 'INVALID_STATUS' WHERE id = '...';
-- ERROR: new row for relation "purchase_orders" violates check constraint
```

**Cause:** Status not in allowed values

**Solution:**
```sql
-- Use valid status
UPDATE purchase_orders SET status = 'ACCEPTED' WHERE id = '...';

-- Valid statuses: CREATED, ACCEPTED, PLANNED, DELIVERED
```

---

### Error 4: "Cannot delete vendor - has purchase orders"

**Problem:**
```sql
DELETE FROM vendors WHERE id = '...';
-- ERROR: update or delete on table "vendors" violates foreign key constraint 
-- on table "purchase_orders"
```

**Cause:** vendor_id has ON DELETE RESTRICT (POs exist)

**Solution:**
```sql
-- Option 1: Soft delete
UPDATE vendors SET is_active = false WHERE id = '...';

-- Option 2: Delete POs first
DELETE FROM purchase_orders WHERE vendor_id = '...';
DELETE FROM vendors WHERE id = '...';
```

---

### Error 5: "Quantity must be > 0"

**Problem:**
```sql
INSERT INTO purchase_order_line_items (..., quantity, ...) 
VALUES (..., 0, ...);
-- ERROR: new row violates check constraint
```

**Cause:** quantity = 0 (must be > 0)

**Solution:**
```sql
-- Use positive quantity
INSERT INTO purchase_order_line_items (..., quantity, ...) 
VALUES (..., 100, ...);
```

---

### Error 6: "Invalid email format"

**Problem:**
```sql
INSERT INTO users (email, ...) 
VALUES ('not-an-email', ...);
-- Application layer validation error
```

**Cause:** Email not in valid format

**Solution:**
```sql
-- Use valid email format
INSERT INTO users (email, ...) 
VALUES ('john@acme.com', ...);
```

---

## Best Practices

✅ **DO:**
- Always use parameterized queries (prevent SQL injection)
- Hash passwords before storing
- Update `updated_at` on every change
- Use soft delete (UPDATE is_active = false)
- Check for duplicates before INSERT
- Validate foreign keys exist
- Log important changes to history tables

❌ **DON'T:**
- Use string concatenation for SQL queries
- Store plain text passwords
- DELETE without soft delete first
- Ignore constraint violations
- Update primary keys
- Delete vendors with active POs
- Delete without checking dependencies

---

## Performance Tips

### Index Queries
```sql
-- These columns have indexes (fast queries):
- vendors.code
- users.email
- users.vendor_id
- purchase_orders.vendor_id
- purchase_orders.po_number
- purchase_order_line_items.po_id
```

### Slow Query Patterns to Avoid
```sql
-- ❌ Slow: Text search without index
SELECT * FROM vendors WHERE name LIKE '%something%';

-- ✅ Fast: Lookup by indexed column
SELECT * FROM vendors WHERE code = 'ACME-001';

-- ❌ Slow: Complex joins without proper indexes
SELECT * FROM purchase_orders WHERE vendor_id NOT IN (...);

-- ✅ Fast: Simple equality
SELECT * FROM purchase_orders WHERE vendor_id = '...';
```

This quick reference covers the most common database operations you'll need!
