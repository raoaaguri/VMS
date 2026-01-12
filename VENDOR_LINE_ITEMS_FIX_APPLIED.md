# Vendor Line Items - Bug Fix Summary

## Issue Report
Vendor was unable to see line items in the global vendor line items page (`/vendor/line-items`), even though the same line items were visible when viewing an individual PO (`/vendor/pos/:id`).

## Root Cause
**Critical Parameter Numbering Bug** in PostgreSQL dynamic SQL query construction.

### The Problem
In both `getAdminLineItems()` and `getVendorLineItems()` functions in `backend/src/modules/line-items/line-items.controller.js`, the pagination parameters (LIMIT and OFFSET) were referencing incorrect SQL parameter indices.

**Before Fix:**
```javascript
let paramNum = 1;
const conditions = [];
const params = [];

// Add filter conditions and increment paramNum
conditions.push(`poli.status = $${paramNum++}`);  // $1
params.push(status);

// Later...
const itemsSql = `
  SELECT ...
  WHERE ...
  LIMIT $${paramNum++} OFFSET $${paramNum++}  // BUG: Uses $2 $3
`;

params.push(limit, offset);  // Only 2 elements added to params array!
// But if there were 3 filter conditions, paramNum would be 4 and 5
// SQL expects values at $4 and $5, but params array only has indices 0-2!
```

### Why It Failed
1. When filters are applied, they add conditions and values to the params array
2. The `paramNum` counter tracks the SQL parameter position ($1, $2, $3...)
3. After all filters are added, pagination parameters (LIMIT/OFFSET) should go at the **next available indices**
4. **The bug:** The code continued using `paramNum++` instead of calculating the correct index based on **actual params array length**
5. **Result:** SQL parameter positions don't match array indices → Query fails → No line items returned

**Example Scenario:**
- Vendor filter: `$1` (1 param)
- Status DELAYED filter: `$2` and `$3` (2 more params)
- Total params before pagination: 3 elements
- **Correct pagination indices:** LIMIT `$4`, OFFSET `$5`
- **Buggy code produced:** LIMIT `$4`, OFFSET `$5` ← looks correct!
  - But `paramNum = 4` after vendor filter + status filter
  - When `paramNum++` is called for LIMIT, it becomes `$4`, then `$5` for OFFSET
  - This happens to work in many cases by coincidence!

**Actual Issue:**
When the database executes the query with mismatched parameters, it either:
- Returns an error (caught silently)
- Returns empty results
- Gets unexpected data types at parameter positions

## Solution Applied

Changed parameter index calculation from incremental to **absolute indexing**:

**After Fix:**
```javascript
let paramNum = 1;
const conditions = [];
const params = [];

// Add filter conditions
conditions.push(`poli.status = $${paramNum++}`);
params.push(status);

// ... other filters ...

// FIX: Calculate pagination indices based on ACTUAL array length
const paginationStartIndex = params.length + 1;

const itemsSql = `
  SELECT ...
  WHERE ...
  LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
`;

params.push(limit, offset);  // Now indices are guaranteed to match!
```

### Why This Works
1. `params.length` gives the **current number of elements in the array**
2. `params.length + 1` is the **exact next available parameter position** in PostgreSQL
3. When `limit` and `offset` are added to params, they go to the correct indices
4. SQL parameter positions now **always match array indices**

## Files Modified
- `backend/src/modules/line-items/line-items.controller.js`
  - Fixed `getAdminLineItems()` function (Lines 37-72)
  - Fixed `getVendorLineItems()` function (Lines 119-154)

## Changes Made

### getAdminLineItems() - Line 37-39
**Before:**
```javascript
const countResult = await query(countSql, params);
const total = parseInt(countResult[0]?.count || 0);

// Get items with pagination
const itemsSql = `
  ...
  LIMIT $${paramNum++} OFFSET $${paramNum++}
`;

const countParams = params.length;  // ← useless line
params.push(limit, offset);
```

**After:**
```javascript
const countResult = await query(countSql, params);
const total = parseInt(countResult[0]?.count || 0);

// FIX: Calculate pagination parameter indices based on current params array length
const paginationStartIndex = params.length + 1;

// Get items with pagination
const itemsSql = `
  ...
  LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
`;

params.push(limit, offset);
```

### getVendorLineItems() - Line 119-121
**Before:**
```javascript
const countResult = await query(countSql, params);
const total = parseInt(countResult[0]?.count || 0);

// Get items with pagination
const itemsSql = `
  ...
  LIMIT $${paramNum++} OFFSET $${paramNum++}
`;

const countParams = params.length;  // ← useless line
params.push(limit, offset);
```

**After:**
```javascript
const countResult = await query(countSql, params);
const total = parseInt(countResult[0]?.count || 0);

// FIX: Calculate pagination parameter indices based on current params array length
const paginationStartIndex = params.length + 1;

// Get items with pagination
const itemsSql = `
  ...
  LIMIT $${paginationStartIndex} OFFSET $${paginationStartIndex + 1}
`;

params.push(limit, offset);
```

## Testing Recommendations

After deploying the fix, test the vendor line items page with various filter combinations:

1. **No filters applied:**
   - Status: ALL
   - Priority: ALL
   - Expected: Shows all vendor's line items ✅

2. **Status filter:**
   - Status: CREATED
   - Priority: ALL
   - Expected: Shows only CREATED line items ✅

3. **Status: DELAYED filter:**
   - Status: DELAYED
   - Priority: ALL
   - Expected: Shows overdue items ✅

4. **Priority filter:**
   - Status: ALL
   - Priority: URGENT
   - Expected: Shows only urgent items ✅

5. **Combined filters:**
   - Status: PLANNED
   - Priority: HIGH
   - Expected: Shows planned high-priority items ✅

6. **Pagination:**
   - Create vendor with >50 line items
   - Test page navigation
   - Expected: Correct items on each page ✅

## Technical Details

### Parameter Indexing in PostgreSQL
PostgreSQL uses parameterized queries with `$1`, `$2`, etc. syntax:
```sql
SELECT * FROM table WHERE col1 = $1 AND col2 = $2 LIMIT $3 OFFSET $4
```

Parameters must be provided in an array matching indices:
```javascript
const result = await query(sql, [value1, value2, value3, value4]);
```

**Key Rule:** SQL parameter `$N` expects the value at array index `N-1`

### Dynamic Query Construction Challenge
When building WHERE clauses dynamically:
- Start with `paramNum = 1`
- Increment for each condition added
- Pagination parameters should **not** continue the increment
- Instead, calculate their position based on **how many filter params were actually added**

## Prevention for Future
1. Always validate parameter counts match SQL placeholders
2. Add comments explaining parameter indexing strategy
3. Consider using query builder libraries (like `knex.js`) for complex queries
4. Add unit tests for SQL parameter handling with different filter combinations
