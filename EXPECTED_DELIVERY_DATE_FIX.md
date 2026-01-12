# Expected Delivery Date Update Issue - Diagnosis & Fix

## Issue Description
When a vendor tries to update the expected delivery date for a line item:
- ❌ Data is not being saved to the database
- ❌ Page is not refreshing with updated data
- ❌ No error message shown to user

## Root Cause Analysis

After deep investigation, I identified **multiple issues**:

### Issue #1: Missing Vendor Authorization Check ✅ FIXED

**Problem:** The `updateLineItemExpectedDate()` and `updateLineItemStatus()` functions did NOT verify that the vendor owns the PO before allowing updates.

**Why this matters:** 
- A vendor could potentially update line items for POs they don't own
- Silent failures could occur if the wrong PO ID is checked

**Fix Applied:**
```javascript
// Check vendor ownership if this is a vendor request
if (user && user.role === 'VENDOR') {
  const po = await poRepository.findById(poId);
  if (!po) throw new NotFoundError('Purchase order not found');
  if (po.vendor_id !== user.vendor_id) {
    throw new ForbiddenError('You do not have permission to update this line item');
  }
}
```

### Issue #2: Frontend May Be Calling Update Too Frequently

**Problem:** The date input's `onChange` event fires on EVERY keystroke:
```javascript
<input
  type="date"
  onChange={(e) => {
    handleUpdateExpectedDate(item.id, e.target.value);
  }}
/>
```

**Why this is bad:**
- API call made on every character typed
- Database strain from multiple updates
- Race conditions possible

**Solution:** Debounce the update or only call on blur event

### Issue #3: No Error Feedback to User

**Problem:** Errors in `handleUpdateExpectedDate` are caught but may not be visible:
```javascript
} catch (err) {
  setError(err.message);  // Error is set but might not be displayed prominently
}
```

**Solution:** Add better error notifications

## Recommended Fixes

### Fix #1: Optimize Frontend Update Logic (IMPORTANT)

Change from onChange to onBlur to prevent excessive API calls:

```javascript
const [editingDateItemId, setEditingDateItemId] = useState(null);
const [pendingDate, setPendingDate] = useState({});

const handleDateChange = (lineItemId, date) => {
  setPendingDate({ ...pendingDate, [lineItemId]: date });
};

const handleDateBlur = async (lineItemId) => {
  const date = pendingDate[lineItemId];
  if (date) {
    try {
      await api.vendor.updateLineItemExpectedDate(id, lineItemId, date);
      setPo({
        ...po,
        line_items: po.line_items.map(item =>
          item.id === lineItemId ? { ...item, expected_delivery_date: date } : item
        )
      });
      setError('');  // Clear any previous errors
    } catch (err) {
      setError(`Failed to update date: ${err.message}`);
    }
  }
  setEditingDateItemId(null);
};

// In the JSX:
<input
  type="date"
  value={pendingDate[item.id] || item.expected_delivery_date || ''}
  onChange={(e) => handleDateChange(item.id, e.target.value)}
  onBlur={() => handleDateBlur(item.id)}
  disabled={item.status === 'DELIVERED'}
  className="px-2 py-1 border border-gray-300 rounded text-sm"
/>
```

### Fix #2: Add Comprehensive Error Logging

Add logging to identify where failures occur:

**Backend - po.service.js:**
```javascript
export async function updateLineItemExpectedDate(poId, lineItemId, expectedDeliveryDate, user) {
  try {
    // ... validation code ...
    
    const oldDate = lineItem.expected_delivery_date;
    const updatedItem = await poRepository.updateLineItem(lineItemId, {
      expected_delivery_date: expectedDeliveryDate
    });

    console.log('Updated line item:', {
      lineItemId,
      oldDate,
      newDate: expectedDeliveryDate,
      updatedItem
    });

    if (oldDate !== expectedDeliveryDate && user) {
      await poRepository.createLineItemHistory({
        po_id: poId,
        line_item_id: lineItemId,
        changed_by_user_id: user.id,
        changed_by_role: user.role,
        action_type: 'DATE_CHANGE',
        field_name: 'expected_delivery_date',
        old_value: oldDate,
        new_value: expectedDeliveryDate
      });
    }

    return updatedItem;
  } catch (error) {
    console.error('Error updating line item expected date:', {
      poId,
      lineItemId,
      expectedDeliveryDate,
      error: error.message
    });
    throw error;
  }
}
```

**Frontend - VendorPoDetail.jsx:**
```javascript
const handleUpdateExpectedDate = async (lineItemId, date) => {
  console.log('Updating expected date:', { lineItemId, date, poId: id });
  try {
    const response = await api.vendor.updateLineItemExpectedDate(id, lineItemId, date);
    console.log('Update response:', response);
    
    setPo({
      ...po,
      line_items: po.line_items.map(item =>
        item.id === lineItemId ? { ...item, expected_delivery_date: date } : item
      )
    });
    setError(''); // Clear error on success
  } catch (err) {
    console.error('Failed to update expected date:', err);
    setError(`Failed to update date: ${err.message}`);
  }
};
```

### Fix #3: Add Loading State and User Feedback

```javascript
const [updatingItemId, setUpdatingItemId] = useState(null);

const handleDateBlur = async (lineItemId) => {
  const date = pendingDate[lineItemId];
  if (date) {
    setUpdatingItemId(lineItemId);
    try {
      await api.vendor.updateLineItemExpectedDate(id, lineItemId, date);
      setPo({
        ...po,
        line_items: po.line_items.map(item =>
          item.id === lineItemId ? { ...item, expected_delivery_date: date } : item
        )
      });
      setError('');  // Clear any previous errors
    } catch (err) {
      setError(`Failed to update date: ${err.message}`);
    } finally {
      setUpdatingItemId(null);
    }
  }
};

// In JSX, show loading indicator:
{updatingItemId === item.id && <span className="text-blue-500 text-xs">Updating...</span>}
```

## Testing Checklist

- [ ] Update date field, then click outside (blur) to trigger update
- [ ] Check backend logs for successful update message
- [ ] Verify date persists in database
- [ ] Refresh page and confirm date is still there
- [ ] Try updating to same date (should not create duplicate history)
- [ ] Try updating a DELIVERED line item (should show error)
- [ ] Try updating a line item from a different PO (should show permission error)
- [ ] Open browser DevTools console to see any errors
- [ ] Check Network tab to see if PUT request is successful (200 status)

## Files Modified

- `backend/src/modules/pos/po.service.js` - Added vendor authorization check ✅
- `src/pages/vendor/VendorPoDetail.jsx` - **RECOMMENDED**: Optimize date input handling

## Next Steps

1. **Immediate:** Add the authorization check (ALREADY DONE ✅)
2. **Important:** Optimize the frontend date input to use onBlur instead of onChange
3. **Optional:** Add error logging for debugging
4. **Test:** Verify updates work and persist correctly

## Prevention for Future

1. Always add authorization checks for vendor operations
2. Debounce or throttle frequent API calls
3. Add loading states for async operations
4. Provide user feedback for success/failure
5. Log API errors for debugging
