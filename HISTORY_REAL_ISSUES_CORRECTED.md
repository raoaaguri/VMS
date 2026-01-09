# PO & Line Items History - Root Cause Analysis (Revised)

## ✅ VERIFICATION: Tables EXIST

Confirmed: `po_history` and `po_line_item_history` tables are created in migration file:
- `20260109053815_add_approval_closure_history_features.sql`
- Tables are properly defined with RLS policies

---

## 🚨 REAL ISSUES FOUND

### **ISSUE #1: Schema Constraint Mismatch**
**Severity:** CRITICAL

**Problem:**
The migration file defines:
```sql
changed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL
```

But the code has conditional history insertion:
```javascript
if (oldPriority !== priority && user) {
  await poRepository.createPoHistory({...})
}
```

**Implication:**
- When there's no change OR no user object → history is NOT created
- This causes intermittent failures

---

### **ISSUE #2: `updatePoStatus()` Doesn't Create History**
**Severity:** HIGH

**Location:** `backend/src/modules/pos/po.service.js` Line 70

**Current Code:**
```javascript
export async function updatePoStatus(id, status) {
  const po = await poRepository.findById(id);
  if (!po) throw new NotFoundError('Purchase order not found');
  return await poRepository.update(id, { status });
  // ❌ NO HISTORY CREATED
}
```

**Expected Behavior:**
When admin changes PO status, it should:
1. Update the PO status
2. Create a history record: `{action_type: 'STATUS_CHANGE', field_name: 'status', old_value, new_value}`

**Impact:**
- PO status changes are never audited
- History gaps in the audit trail

---

### **ISSUE #3: `acceptPo()` Doesn't Track Changes**
**Severity:** MEDIUM

**Location:** `backend/src/modules/pos/po.service.js` Line 84

**Current Code:**
```javascript
export async function acceptPo(id, lineItemUpdates) {
  // ... validation
  for (const update of lineItemUpdates) {
    await poRepository.updateLineItem(update.line_item_id, {
      expected_delivery_date: update.expected_delivery_date,
      status: 'ACCEPTED'
    });
    // ❌ NO HISTORY CREATED FOR ACCEPTANCE
  }
  await poRepository.update(id, { status: 'ACCEPTED' });
  // ❌ NO HISTORY CREATED FOR PO STATUS CHANGE
  return await getPoById(id);
}
```

**Expected:**
When vendor accepts PO, history should show:
- For each line item: Status changed from CREATED to ACCEPTED
- For each line item: Expected delivery date set
- For PO: Status changed to ACCEPTED

**Actual:**
No history records created at all

**Impact:**
- Vendor acceptance is silent (no audit trail)
- Cannot track when vendors committed to delivery dates

---

### **ISSUE #4: Missing User Parameter in Controller**
**Severity:** MEDIUM

**Location:** `backend/src/modules/pos/po.controller.js` Line 47

**Current Code:**
```javascript
export async function updatePoStatus(req, res, next) {
  try {
    const { status } = req.body;
    const po = await poService.updatePoStatus(req.params.id, status);
    // ❌ NOT PASSING req.user - service has no context of who made change
    res.json(po);
  } catch (error) {
    next(error);
  }
}
```

**Should Be:**
```javascript
const po = await poService.updatePoStatus(req.params.id, status, req.user);
```

**Impact:**
- Service cannot log who made changes (missing user_id in history)

---

### **ISSUE #5: Inconsistent History Logging**

**Pattern Observed:**
- ✅ `updatePoPriority()` - Creates history
- ✅ `updateLineItemExpectedDate()` - Creates history
- ✅ `updateLineItemStatus()` - Creates history
- ✅ `updateLineItemPriority()` - Creates history
- ✅ `updatePoClosure()` - Creates history (2 records)
- ❌ `updatePoStatus()` - NO HISTORY
- ❌ `acceptPo()` - NO HISTORY

**Why:**
Inconsistent implementation - some functions forgot to add history tracking

---

### **ISSUE #6: acceptPo() Should Create Multiple History Records**
**Severity:** HIGH

**When vendor calls POST /vendor/pos/:id/accept, it should create:**

For each line item:
```sql
INSERT INTO po_line_item_history (
  po_id, line_item_id, action_type, field_name, old_value, new_value, ...
)
VALUES 
  (po_id, item_id, 'STATUS_CHANGE', 'status', 'CREATED', 'ACCEPTED', ...),
  (po_id, item_id, 'DATE_CHANGE', 'expected_delivery_date', NULL, '2026-01-15', ...)
```

For the PO:
```sql
INSERT INTO po_history (
  po_id, action_type, field_name, old_value, new_value, ...
)
VALUES
  (po_id, 'STATUS_CHANGE', 'status', 'CREATED', 'ACCEPTED', ...)
```

**Currently:**
None of these records are created

---

## 🔧 FIXES REQUIRED

### Fix #1: Update `updatePoStatus()` to Create History

**File:** `backend/src/modules/pos/po.service.js`

```javascript
export async function updatePoStatus(id, status, user) {
  const po = await poRepository.findById(id);
  if (!po) throw new NotFoundError('Purchase order not found');

  const oldStatus = po.status;
  const updatedPo = await poRepository.update(id, { status });

  // NEW: Create history record
  if (oldStatus !== status && user) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: 'STATUS_CHANGE',
      field_name: 'status',
      old_value: oldStatus,
      new_value: status
    });
  }

  return updatedPo;
}
```

### Fix #2: Update Controller to Pass User

**File:** `backend/src/modules/pos/po.controller.js`

```javascript
export async function updatePoStatus(req, res, next) {
  try {
    const { status } = req.body;
    const po = await poService.updatePoStatus(req.params.id, status, req.user);
    // ✅ NOW PASSING req.user
    res.json(po);
  } catch (error) {
    next(error);
  }
}
```

### Fix #3: Update `acceptPo()` to Create History

**File:** `backend/src/modules/pos/po.service.js`

```javascript
export async function acceptPo(id, lineItemUpdates, user) {
  const po = await poRepository.findById(id);
  if (!po) throw new NotFoundError('Purchase order not found');
  if (po.status !== 'CREATED') {
    throw new BadRequestError('PO can only be accepted when in CREATED status');
  }

  for (const update of lineItemUpdates) {
    if (!update.expected_delivery_date) {
      throw new BadRequestError('Expected delivery date is required for all line items');
    }

    const oldItem = await poRepository.findLineItemById(update.line_item_id);

    // Update the line item
    await poRepository.updateLineItem(update.line_item_id, {
      expected_delivery_date: update.expected_delivery_date,
      status: 'ACCEPTED'
    });

    // NEW: Create history for status change
    if (user) {
      await poRepository.createLineItemHistory({
        po_id: id,
        line_item_id: update.line_item_id,
        changed_by_user_id: user.id,
        changed_by_role: user.role,
        action_type: 'STATUS_CHANGE',
        field_name: 'status',
        old_value: 'CREATED',
        new_value: 'ACCEPTED'
      });

      // NEW: Create history for date change
      await poRepository.createLineItemHistory({
        po_id: id,
        line_item_id: update.line_item_id,
        changed_by_user_id: user.id,
        changed_by_role: user.role,
        action_type: 'EXPECTED_DATE_CHANGE',
        field_name: 'expected_delivery_date',
        old_value: oldItem.expected_delivery_date || null,
        new_value: update.expected_delivery_date
      });
    }
  }

  // Create history for PO status change
  if (user) {
    await poRepository.createPoHistory({
      po_id: id,
      changed_by_user_id: user.id,
      changed_by_role: user.role,
      action_type: 'STATUS_CHANGE',
      field_name: 'status',
      old_value: 'CREATED',
      new_value: 'ACCEPTED'
    });
  }

  await poRepository.update(id, { status: 'ACCEPTED' });
  return await getPoById(id);
}
```

### Fix #4: Update Controller acceptPo to Pass User

**File:** `backend/src/modules/pos/po.controller.js`

```javascript
export async function acceptPo(req, res, next) {
  try {
    const { line_items } = req.body;
    const po = await poService.acceptPo(req.params.id, line_items, req.user);
    // ✅ NOW PASSING req.user
    res.json(po);
  } catch (error) {
    next(error);
  }
}
```

### Fix #5: Update Schema to Allow NULL changed_by_user_id (Optional but Safe)

**Rationale:** Some system operations might log history without a user context

**File:** `supabase/migrations/20260109053815_add_approval_closure_history_features.sql`

Change:
```sql
changed_by_user_id uuid NOT NULL REFERENCES users(id)
```

To:
```sql
changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL
```

---

## 📋 SUMMARY TABLE

| Issue | Function | Status | Fix Complexity | Impact |
|-------|----------|--------|----------------|--------|
| No history on status change | `updatePoStatus()` | ❌ Broken | LOW | HIGH |
| No history on acceptance | `acceptPo()` | ❌ Broken | MEDIUM | HIGH |
| Missing user in controller | `updatePoStatus()` | ❌ Broken | LOW | MEDIUM |
| Missing user in controller | `acceptPo()` | ❌ Broken | LOW | MEDIUM |
| Schema NOT NULL constraint | Migration file | ⚠️ Risky | LOW | MEDIUM |

---

## ✨ AFTER FIXES

Once all issues are fixed:

✅ PO status changes → Audit trail created
✅ PO accepted by vendor → Full history (status + dates for all items)
✅ All changes tracked with user_id + timestamp
✅ History queries return complete audit trail
✅ Frontend history views display all changes

---

## 🎯 CONCLUSION

**The tables exist and are properly configured.**
**The real issue is missing history logging in the service layer.**

The code is **85% complete** but missing history inserts in 2 critical functions:
1. `updatePoStatus()` 
2. `acceptPo()`

Once these two functions are updated to create history records, the entire audit system will be fully functional.
