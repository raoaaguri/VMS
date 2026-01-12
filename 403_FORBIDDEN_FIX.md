# 403 Forbidden Error - Root Cause & Fix

## 🔴 Root Cause

**The 403 error occurs because of a vendor authorization mismatch.**

### The Exact Issue

1. **Authorization Check was Added** (in previous fix):
   ```javascript
   if (po.vendor_id !== user.vendor_id) {
     throw new ForbiddenError('You do not have permission...');
   }
   ```

2. **But the comparison might fail if:**
   - `po.vendor_id` and `user.vendor_id` are different types (UUID vs string)
   - One or both values are NULL
   - Whitespace differences in UUID strings
   - The PO vendor_id column is NULL in database

3. **Why this happens:**
   - PostgreSQL UUIDs can be returned as strings or UUID objects
   - JavaScript comparison might fail if types differ
   - No null checks before comparison

---

## ✅ Fixes Applied

### Fix #1: Improved Authorization Check with Type Safety
**File:** `backend/src/modules/pos/po.service.js`

**Before:**
```javascript
if (po.vendor_id !== user.vendor_id) {
  throw new ForbiddenError('You do not have permission...');
}
```

**After:**
```javascript
// Check for null/undefined values
if (!user.vendor_id) {
  throw new ForbiddenError('Your user account is not associated with a vendor');
}

if (!po.vendor_id) {
  throw new BadRequestError('This purchase order is not associated with a vendor');
}

// Normalize and compare as strings
if (String(po.vendor_id).trim() !== String(user.vendor_id).trim()) {
  throw new ForbiddenError('You do not have permission to update this line item');
}
```

**Applied to:**
- `updateLineItemExpectedDate()`
- `updateLineItemStatus()`

**Benefits:**
- Proper null checking with specific error messages
- Converts both to strings (handles UUID type mismatches)
- Trims whitespace
- Better error reporting for debugging

---

### Fix #2: Added Authorization Check to getPoById
**File:** `backend/src/modules/pos/po.controller.js`

**Problem:** Vendors could call `getPoById()` to view ANY PO, not just their own!

**Solution Added:**
```javascript
export async function getPoById(req, res, next) {
  try {
    const po = await poService.getPoById(req.params.id);
    
    // Check vendor authorization if this is a vendor request
    if (req.user && req.user.role === 'VENDOR') {
      if (!po.vendor_id) {
        return next(new BadRequestError('This purchase order is not associated with a vendor'));
      }
      if (String(po.vendor_id).trim() !== String(req.user.vendor_id).trim()) {
        return next(new ForbiddenError('You do not have permission to view this purchase order'));
      }
    }
    
    res.json(po);
  } catch (error) {
    next(error);
  }
}
```

**Benefits:**
- Vendors can only view their own POs
- Admins can still view any PO (no check for admin role)
- Same type-safe comparison logic
- Prevents unauthorized data access

---

## 🔐 Security Model

```
Vendor tries to update line item in PO:

PUT /vendor/pos/{poId}/line-items/{lineItemId}/expected-delivery-date

Step 1: Route Protection
├─ authMiddleware: Verify JWT token
└─ requireVendor: Verify user.role === 'VENDOR'

Step 2: Data Access Authorization
├─ getPoById: Verify PO belongs to vendor
└─ updateLineItemExpectedDate: Verify PO belongs to vendor

Step 3: Data Integrity
├─ Verify line item exists
└─ Verify line item belongs to PO

Result: ✅ Only vendors can update their own POs' line items
```

---

## 🧪 Testing After Fix

### Test Case 1: Vendor Updates Own PO
```
1. Vendor A logs in
2. Retrieves their own PO (ID: po-123)
3. Updates line item expected date
4. Expected: ✅ 200 OK, date updated

Why it works:
- po.vendor_id = vendor_a_id
- user.vendor_id = vendor_a_id
- String comparison passes ✓
```

### Test Case 2: Vendor Tries to Update Different Vendor's PO
```
1. Vendor A logs in
2. Tries to update line item in Vendor B's PO (ID: po-456)
3. Expected: ❌ 403 Forbidden

Why it fails:
- po.vendor_id = vendor_b_id
- user.vendor_id = vendor_a_id
- String comparison fails ✗
```

### Test Case 3: Vendor Tries to View Different Vendor's PO
```
1. Vendor A logs in
2. Calls GET /vendor/pos/po-456
3. Expected: ❌ 403 Forbidden

Why it fails:
- Now getPoById also checks authorization
- po.vendor_id = vendor_b_id
- user.vendor_id = vendor_a_id
- Returns 403 before returning PO data
```

### Test Case 4: Admin Can View Any PO
```
1. Admin logs in (role = 'ADMIN')
2. Calls GET /vendor/pos/po-123 (won't happen, they use /admin/pos)
3. OR calls the same endpoint if mixed usage
4. Expected: ✅ 200 OK

Why it works:
- Check is only for role === 'VENDOR'
- Admins bypass the check
- Admin can access any PO
```

---

## 📋 Files Modified

1. **backend/src/modules/pos/po.service.js**
   - `updateLineItemExpectedDate()` - Enhanced null checking and type-safe comparison
   - `updateLineItemStatus()` - Enhanced null checking and type-safe comparison

2. **backend/src/modules/pos/po.controller.js**
   - Added imports for error classes
   - `getPoById()` - Added vendor authorization check

---

## 🔍 Common Issues If 403 Still Appears

### Issue 1: vendor_id is NULL in JWT token
**Check:**
```sql
SELECT id, email, role, vendor_id FROM users WHERE email = 'vendor@example.com';
```
**Fix:** Ensure the user record has a vendor_id set

### Issue 2: PO vendor_id is NULL in database
**Check:**
```sql
SELECT id, po_number, vendor_id FROM purchase_orders WHERE id = 'po-id-here';
```
**Fix:** Update PO with correct vendor_id:
```sql
UPDATE purchase_orders SET vendor_id = 'vendor-id' WHERE id = 'po-id';
```

### Issue 3: vendor_id mismatch
**Check:** Ensure vendor_id in JWT matches the PO's vendor_id
- Verify user's vendor_id in users table
- Verify PO's vendor_id in purchase_orders table
- They must match

### Issue 4: UUID format issue
**Check:** Both should be valid UUIDs
- Compare the actual values being compared
- Check logs for the exact values

---

## ✨ Summary

| Aspect | Before | After |
|--------|--------|-------|
| **getPoById authorization** | ❌ None | ✅ Added |
| **Type safety** | ❌ Direct comparison | ✅ String conversion |
| **Null checking** | ❌ None | ✅ Comprehensive |
| **Error messages** | ❌ Generic | ✅ Specific |
| **Vendor isolation** | ⚠️ Partial | ✅ Complete |

The 403 error should now only appear when:
1. Vendor tries to access another vendor's PO ✓ (correct behavior)
2. vendor_id is actually NULL (needs fix in database)
3. vendor_id mismatch (different vendor trying to update)

If 403 still appears, check the database values!
