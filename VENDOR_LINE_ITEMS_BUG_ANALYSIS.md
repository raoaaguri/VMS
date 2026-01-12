# Vendor Line Items Bug - Deep Dive Analysis

## 🔴 CRITICAL BUG FOUND

### Issue Summary
**Vendor line items are not displaying even though they exist in the PO detail view.**

The vendor can see line items when clicking on a PO (via `/vendor/pos/:id`), but the same line items don't appear in the global vendor line items page (`/vendor/line-items`).

---

## Root Cause Analysis

### The Problem: Parameter Numbering Bug in `getVendorLineItems()`

**File:** `backend/src/modules/line-items/line-items.controller.js` (Lines 83-166)

#### What's Happening:

```javascript
export async function getVendorLineItems(req, res, next) {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const { vendor_id } = req.user;  // ✅ vendor_id is correctly extracted from token
    const offset = (page - 1) * limit;

    const params = [];
    let paramNum = 1;
    const conditions = [];
    
    const today = new Date().toISOString().split('T')[0];

    // Always filter by vendor
    conditions.push(`po.vendor_id = $${paramNum++}`);  // $1
    params.push(vendor_id);

    // ... status and priority filters ...

    const whereClause = ` WHERE ${conditions.join(' AND ')}`;

    // Get total count - USES params ARRAY CORRECTLY
    const countSql = `...`;
    const countResult = await query(countSql, params);  // ✅ Uses params with correct length
    const total = parseInt(countResult[0]?.count || 0);

    // Get items with pagination - WRONG PARAMETER NUMBERING!
    const itemsSql = `
      ...
      LIMIT $${paramNum++} OFFSET $${paramNum++}  // ❌ PROBLEM HERE!
    `;
    
    // CRITICAL BUG: The paramNum continues from where it left off!
    // If there's 1 condition (vendor_id), paramNum = 2
    // If status filter adds 2 conditions, paramNum could be 4
    // If priority filter adds 1 condition, paramNum could be 5
    // So LIMIT becomes $5 OFFSET $6
    // But params array only has: [vendor_id] (1 element) before adding limit/offset
    
    const countParams = params.length;  // ❌ Useless line - params.length is not updated
    params.push(limit, offset);  // Now params = [vendor_id, 50, 0]
                                 // But SQL expects LIMIT at position 5, OFFSET at position 6!
    
    const items = await query(itemsSql, params);  // ❌ WRONG PARAMETERS SENT!

    res.json({
      items: items || [],
      page: parseInt(page),
      limit: parseInt(limit),
      total: total
    });
  } catch (error) {
    next(error);
  }
}
```

#### Why This Works for PO Detail but Not for Line Items:

**In `/vendor/pos/:id` (Works):**
- Uses `findLineItems(poId)` from `po.repository.js`
- Simple query: `SELECT * FROM purchase_order_line_items WHERE po_id = $1`
- Uses Supabase adapter syntax (direct `.select()` calls)
- No parameter numbering issues

**In `/vendor/line-items` (Broken):**
- Uses raw SQL with PostgreSQL parameter numbering ($1, $2, $3, etc.)
- COMPLEX dynamic parameter numbering based on which filters are applied
- `paramNum` variable gets out of sync with actual `params` array indices
- The LIMIT and OFFSET parameters reference wrong array indices

---

## Detailed Bug Trace

### Scenario 1: No filters (status=ALL, priority=ALL)

**Expected SQL:**
```sql
SELECT ... FROM purchase_order_line_items poli
JOIN purchase_orders po ON poli.po_id = po.id
WHERE po.vendor_id = $1
LIMIT $2 OFFSET $3
```

**Expected params:** `[vendor_id, 50, 0]`

**What actually happens:**
```javascript
// After vendor filter
paramNum = 2
params = [vendor_id]

// No status filter applied
// No priority filter applied

// Building SQL with pagination
LIMIT $${paramNum++}  // produces $2
OFFSET $${paramNum++} // produces $3

params.push(limit, offset)  // params becomes [vendor_id, 50, 0]
// ✅ WORKS CORRECTLY IN THIS CASE!
```

### Scenario 2: With status filter

**Code path:**
```javascript
// After vendor filter
paramNum = 2
params = [vendor_id]

// Apply status filter
if (status && status !== 'ALL') {
  if (status === 'DELAYED') {
    conditions.push(`poli.expected_delivery_date < $${paramNum++}`); // $2
    params.push(today);  // params = [vendor_id, today]
    conditions.push(`poli.status != $${paramNum++}`);  // $3
    params.push('DELIVERED');  // params = [vendor_id, today, DELIVERED]
  } else {
    conditions.push(`poli.status = $${paramNum++}`); // $2
    params.push(status);  // params = [vendor_id, status]
  }
}
// paramNum is now 3 or 4 depending on DELAYED

// Building SQL
LIMIT $${paramNum++}  // produces $4 or $5
OFFSET $${paramNum++} // produces $5 or $6

params.push(limit, offset)  // Only adds 2 more elements!
// ❌ MISALIGNMENT: SQL expects parameters at positions 4+, but params array only has 3-4 elements!
```

---

## Comparison with `getAdminLineItems()`

**File:** `backend/src/modules/line-items/line-items.controller.js` (Lines 30-81)

The admin function has the **SAME BUG**:

```javascript
export async function getAdminLineItems(req, res, next) {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const params = [];
    let paramNum = 1;
    const conditions = [];
    
    const today = new Date().toISOString().split('T')[0];

    // Apply status filter
    if (status && status !== 'ALL') {
      if (status === 'DELAYED') {
        conditions.push(`poli.expected_delivery_date < $${paramNum++}`);
        params.push(today);
        conditions.push(`poli.status != $${paramNum++}`);
        params.push('DELIVERED');
      } else {
        conditions.push(`poli.status = $${paramNum++}`);
        params.push(status);
      }
    }

    // Apply priority filter
    if (priority && priority !== 'ALL') {
      conditions.push(`poli.line_priority = $${paramNum++}`);
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM purchase_order_line_items poli ${whereClause}`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult[0]?.count || 0);

    // Get items with pagination
    const itemsSql = `
      SELECT ... 
      FROM purchase_order_line_items poli
      ...
      ${whereClause}
      ORDER BY poli.expected_delivery_date ASC, poli.line_priority DESC
      LIMIT $${paramNum++} OFFSET $${paramNum++}
    `;
    
    const countParams = params.length;
    params.push(limit, offset);  // ❌ SAME BUG HERE
    
    const items = await query(itemsSql, params);  // ❌ WRONG PARAMETERS
  } catch (error) {
    next(error);
  }
}
```

---

## Why Is It Not Showing Line Items?

When there are filters applied (status, priority), the parameter positions become invalid:

1. **Database receives wrong SQL parameter values:**
   - Position 5 expects a number for LIMIT, but might get a vendor_id or status value
   - Position 6 expects a number for OFFSET, but gets undefined or wrong values

2. **Query execution fails silently:**
   - PostgreSQL returns an error or empty result set
   - The error might not be logged properly
   - Frontend gets `items: []` back

3. **Result:**
   - ✅ Works when no filters (by chance - parameters align correctly)
   - ✅ Works for PO detail (uses different code path with Supabase adapter)
   - ❌ **Breaks when filters are applied** (parameters misalign)

---

## The Fix

### Correct Parameter Handling Pattern:

Instead of continuing to increment `paramNum` for pagination, we need to ensure pagination parameters are added at the correct indices:

**Option 1: Reset paramNum for pagination**
```javascript
// Count pagination parameters needed
const baseParamCount = params.length;

// Build SQL with correct references
const itemsSql = `...
  LIMIT $${baseParamCount + 1} OFFSET $${baseParamCount + 2}
`;

params.push(limit, offset);
```

**Option 2: Track parameter count explicitly**
```javascript
const paginationStartIndex = params.length + 1;

const itemsSql = `...
  LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
`;

params.push(limit, offset);
```

**Option 3: Build params array more carefully** (BEST)
```javascript
// Prepare params array with all values in correct order
const filterParams = [vendor_id];
if (status && status !== 'ALL') {
  if (status === 'DELAYED') {
    filterParams.push(today, 'DELIVERED');
  } else {
    filterParams.push(status);
  }
}
if (priority && priority !== 'ALL') {
  filterParams.push(priority);
}

// Add pagination at predictable positions
const allParams = [...filterParams, limit, offset];

// Build SQL with explicit parameter positions
const paginationStart = filterParams.length + 1;
const itemsSql = `...
  LIMIT $${paginationStart} OFFSET $${paginationStart + 1}
`;

const items = await query(itemsSql, allParams);
```

---

## Summary

| Aspect | PO Detail (`/vendor/pos/:id`) | Line Items (`/vendor/line-items`) |
|--------|------|------|
| **API Endpoint** | GET /vendor/pos/:id | GET /vendor/line-items |
| **Data Source** | po.repository.findLineItems() | line-items.controller.getVendorLineItems() |
| **Query Type** | Supabase adapter (.select()) | Raw SQL with parameter numbering |
| **Parameter Handling** | ✅ Simple, no issues | ❌ **CRITICAL BUG** |
| **Works When** | ✅ Always | ❌ Only when no filters applied |
| **Shows Data** | ✅ YES | ❌ NO (with filters) or ✅ YES (no filters) |

---

## Recommendation

**IMMEDIATE FIX REQUIRED:**
1. Fix parameter numbering in both `getAdminLineItems()` and `getVendorLineItems()`
2. Test with various filter combinations
3. Add error logging to catch SQL parameter mismatches in the future
