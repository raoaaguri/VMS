# Diagnostic SQL Queries for 403 Error

Run these queries to diagnose why you're getting 403 Forbidden errors:

## 1. Check if User has vendor_id
```sql
-- Find the vendor user by email
SELECT id, name, email, role, vendor_id, is_active 
FROM users 
WHERE email = 'your-vendor-email@example.com';

-- Example response:
-- id | name | email | role | vendor_id | is_active
-- ---|------|-------|------|-----------|----------
-- uuid | John Vendor | vendor@test.com | VENDOR | vendor-uuid | true
```

**Issue:** If `vendor_id` is NULL, the user is not linked to a vendor!
**Fix:** Link the user to a vendor:
```sql
UPDATE users 
SET vendor_id = 'correct-vendor-uuid' 
WHERE id = 'user-uuid';
```

---

## 2. Check if PO has vendor_id
```sql
-- Check the specific PO
SELECT id, po_number, vendor_id, status, created_at 
FROM purchase_orders 
WHERE id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091';

-- Example response:
-- id | po_number | vendor_id | status | created_at
-- ---|-----------|-----------|--------|------------
-- uuid | PO-001 | vendor-uuid | CREATED | 2026-01-12
```

**Issue:** If `vendor_id` is NULL, the PO is not linked to any vendor!
**Fix:** Link the PO to the correct vendor:
```sql
UPDATE purchase_orders 
SET vendor_id = 'vendor-uuid' 
WHERE id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091';
```

---

## 3. Verify the vendor_id values MATCH
```sql
-- Check if they match
SELECT 
  u.id as user_id,
  u.email,
  u.vendor_id as user_vendor_id,
  po.id as po_id,
  po.po_number,
  po.vendor_id as po_vendor_id,
  (u.vendor_id = po.vendor_id) as IDs_MATCH
FROM users u
CROSS JOIN purchase_orders po
WHERE u.email = 'your-vendor-email@example.com'
AND po.id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091';

-- Expected output:
-- user_vendor_id | po_vendor_id | IDs_MATCH
-- --------------|-------------|----------
-- vendor-uuid-1 | vendor-uuid-1 | true ✓
```

**Issue:** If `IDs_MATCH` is false, they are different vendors!
**Fix:** Ensure the PO belongs to the correct vendor

---

## 4. Check all vendor users for a specific vendor
```sql
-- Find all users for a vendor
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.vendor_id,
  v.name as vendor_name
FROM users u
LEFT JOIN vendors v ON u.vendor_id = v.id
WHERE u.vendor_id = 'vendor-uuid-here';
```

---

## 5. Check all POs for a specific vendor
```sql
-- Find all POs for a vendor
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.vendor_id,
  v.name as vendor_name,
  COUNT(poli.id) as line_item_count
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN purchase_order_line_items poli ON po.id = poli.po_id
WHERE po.vendor_id = 'vendor-uuid-here'
GROUP BY po.id, po.po_number, po.status, po.vendor_id, v.name;
```

---

## 6. Find the problematic line item
```sql
-- Check the specific line item
SELECT 
  poli.id,
  poli.po_id,
  poli.product_code,
  poli.product_name,
  poli.status,
  poli.expected_delivery_date,
  po.po_number,
  po.vendor_id,
  v.name as vendor_name
FROM purchase_order_line_items poli
LEFT JOIN purchase_orders po ON poli.po_id = po.id
LEFT JOIN vendors v ON po.vendor_id = v.id
WHERE poli.id = '6a09365d-2b75-47ce-abb5-8547017268f0';

-- Example response:
-- id | po_id | product_code | vendor_id | vendor_name
-- ---|-------|--------------|-----------|------------
-- uuid | po-uuid | P001 | vendor-uuid-1 | Vendor A
```

**Issue:** Check that the po_id exists and has a vendor_id
**Fix:** If po_id is NULL or vendor_id is NULL, update accordingly

---

## 7. Debug: Check all relevant data at once
```sql
-- Comprehensive check
WITH user_data AS (
  SELECT 
    id, email, role, vendor_id,
    'USER' as source
  FROM users
  WHERE email = 'your-vendor-email@example.com'
),
po_data AS (
  SELECT 
    id, po_number, vendor_id,
    'PO' as source
  FROM purchase_orders
  WHERE id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091'
),
lineitem_data AS (
  SELECT 
    id, po_id, status,
    'LINEITEM' as source
  FROM purchase_order_line_items
  WHERE id = '6a09365d-2b75-47ce-abb5-8547017268f0'
)
SELECT * FROM (
  SELECT email as identifier, vendor_id, 'USER' as type FROM user_data
  UNION
  SELECT po_number, vendor_id, 'PO' FROM po_data
  UNION
  SELECT status::text, po_id, 'LINEITEM' FROM lineitem_data
) as debug_info;
```

---

## Common Solutions

### Issue: vendor_id is NULL
```sql
-- Solution 1: Find the correct vendor_id
SELECT id, name, status FROM vendors LIMIT 5;

-- Solution 2: Update the record
UPDATE purchase_orders 
SET vendor_id = 'correct-vendor-uuid' 
WHERE id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091';
```

### Issue: Wrong vendor_id
```sql
-- Check who owns it currently
SELECT 
  po.po_number,
  po.vendor_id,
  v.name as current_owner
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
WHERE po.id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091';

-- Reassign to correct vendor
UPDATE purchase_orders 
SET vendor_id = 'new-vendor-uuid' 
WHERE id = 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091';
```

### Issue: User not linked to vendor
```sql
-- Find user and correct vendor
SELECT u.id, u.email, v.id, v.name 
FROM users u, vendors v
WHERE u.email = 'vendor@test.com'
AND v.name = 'Correct Vendor Name'
LIMIT 1;

-- Link them
UPDATE users 
SET vendor_id = 'vendor-uuid' 
WHERE id = 'user-uuid';
```

---

## Step-by-Step Verification

1. **Run Query #1** - Check user has vendor_id
2. **Run Query #2** - Check PO has vendor_id  
3. **Run Query #3** - Verify they match
4. **Run Query #6** - Check line item's PO relationship

If all checks pass, the authorization should work!
If any check fails, apply the corresponding fix above.

---

## After Running Fixes

1. Restart backend server
2. Clear browser cache (or logout/login)
3. Try updating the expected delivery date again
4. Should see 200 OK response instead of 403

Let me know what the queries return and I can help further!
