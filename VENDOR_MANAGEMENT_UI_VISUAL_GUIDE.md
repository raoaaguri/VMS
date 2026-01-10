# Vendor Management UI - Visual Guide & Quick Reference

## Page Layout

```
╔════════════════════════════════════════════════════════════════════════╗
║  VENDOR MANAGEMENT                                    [+ Add Vendor]  ║
║  Manage vendors, approvals, and access                               ║
╚════════════════════════════════════════════════════════════════════════╝

┌─ Success/Error Messages (Auto-dismiss after 3s) ─────────────────────┐
│ ✓ Vendor approved successfully!            [X]                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ Status Filter Tabs ────────────────────────────────────────────────────┐
│ All (5) | Pending (2) | Active (3) | Rejected (0)                      │
└────────────────────────────────────────────────────────────────────────┘

┌─ Vendors Table ─────────────────────────────────────────────────────────┐
│ [✓] │ Name     │ Code │ Contact      │ Status    │ Active │ Actions  │
├─────┼──────────┼──────┼──────────────┼───────────┼────────┼──────────┤
│ [ ] │ ACME     │ KUS_ │ John Doe     │ ⏳ Pending │ ⭕ No  │    ▼    │
│ [ ] │ GLOBAL   │ KUS_ │ Jane Smith   │ ✓ Active  │ 🟢 Yes │    ▼    │
│ [ ] │ XYZ Corp │ KUS_ │ Bob Johnson  │ ✕ Reject  │ ⭕ No  │    ▼    │
└─────┴──────────┴──────┴──────────────┴───────────┴────────┴──────────┘
```

---

## Status Definitions

### Approval Status (vendor.status)
```
⏳ PENDING_APPROVAL
   └─ Vendor signed up
   └─ Awaiting admin approval
   └─ Cannot login
   └─ Actions: [Approve] [Reject]

✓ ACTIVE
   └─ Approved by admin
   └─ Can login if is_active=true
   └─ Can manage purchase orders
   └─ Actions: [Edit] [Add User] [Deactivate]

✕ REJECTED
   └─ Rejected by admin
   └─ Cannot login
   └─ No further actions available
```

### Active Status (vendor.is_active)
```
🟢 ACTIVE
   └─ Vendor account enabled
   └─ Can access the system (if approval status is also ACTIVE)
   └─ Users can login
   └─ Click to DEACTIVATE

⭕ INACTIVE
   └─ Vendor account disabled
   └─ Cannot access the system
   └─ Users blocked from login
   └─ Click to REACTIVATE
```

---

## User Workflows

### Workflow 1: Approve New Vendor Signup

```
Start: Vendor signs up from /vendor-signup
       └─ Email: vendor@company.com
       └─ Status: PENDING_APPROVAL
       └─ Active: Inactive
       
Admin Login → Navigate to /admin/vendors
       ↓
See "Pending" tab with "1" count
       ↓
Click "Pending" filter tab
       ↓
Table shows only PENDING vendors
       ↓
Find "ACME Corp" with status "⏳ Pending"
       ↓
Click dropdown menu [▼]
       ↓
┌──────────────────────┐
│ ✓ Approve Vendor    │
│ ✕ Reject Vendor      │
└──────────────────────┘
       ↓
Click "Approve Vendor"
       ↓
Confirmation: "Are you sure you want to approve this vendor?
              They will be able to login and access the system."
       ↓
Admin clicks OK
       ↓
✓ Toast: "Vendor approved successfully!"
       ↓
Vendor row updates:
   Status: ⏳ Pending → ✓ Active
   Actions: [Approve/Reject] → [Edit/Add User]
       ↓
End: Vendor can now login with their credentials
```

---

### Workflow 2: Deactivate a Vendor

```
Start: Vendor is ACTIVE and ACTIVE status is 🟢 Yes
       └─ They can login and access system
       
Admin wants to temporarily block vendor access
       ↓
Click the "🟢 Active" button in Active Status column
       ↓
Confirmation: "Are you sure you want to deactivate this vendor?"
       ↓
Admin clicks OK
       ↓
✓ Toast: "Vendor deactivated successfully"
       ↓
Vendor row updates:
   Active: 🟢 Active → ⭕ Inactive
       ↓
End: Vendor cannot login anymore
      (Even though approval status is still ACTIVE)
      
Note: This is different from rejection!
      Rejection = Disapprove vendor signup
      Deactivation = Temporarily suspend access
```

---

### Workflow 3: Reject Pending Vendor

```
Start: Vendor has PENDING_APPROVAL status
       
Admin reviews vendor application
Admin decides vendor doesn't meet criteria
       ↓
Click dropdown [▼] on vendor row
       ↓
┌──────────────────────┐
│ ✓ Approve Vendor    │
│ ✕ Reject Vendor      │
└──────────────────────┘
       ↓
Click "Reject Vendor"
       ↓
Confirmation: "Are you sure you want to reject this vendor?
              They will not be able to login."
       ↓
Admin clicks OK
       ↓
✓ Toast: "Vendor rejected successfully"
       ↓
Vendor row updates:
   Status: ⏳ Pending → ✕ Rejected
   Actions: [Approve/Reject] → (No actions)
       ↓
End: Vendor cannot login and no actions available
```

---

### Workflow 4: Filter Vendors by Status

```
Admin needs to process all pending approvals
       ↓
Click "Pending" tab at top
       ↓
┌─────────────────────────┐
│ All (8)                 │
│ Pending (3)  ← Click    │
│ Active (4)              │
│ Rejected (1)            │
└─────────────────────────┘
       ↓
Table automatically filters
       ↓
Only shows 3 vendors with status = PENDING_APPROVAL
       ↓
Admin can approve/reject all 3
       ↓
Once approved, they disappear from "Pending" tab
       ↓
Can switch to "Active" tab to verify
```

---

### Workflow 5: Select Multiple Vendors (Future)

```
Admin wants to manage multiple vendors at once
       ↓
Click checkboxes [✓] to select vendors
       ↓
┌────────────────────────────────────────┐
│ [✓] (Select All checkbox)              │
│ [✓] ACME Corp      Status: ⏳ Pending  │
│ [✓] GLOBAL Ltd     Status: ✓ Active    │
│ [ ] XYZ Corp       Status: ✕ Rejected  │
└────────────────────────────────────────┘
       ↓
2 vendors selected
       ↓
In future: Bulk action buttons will appear
   [Approve All] [Reject All] [Deactivate All]
```

---

## Key Differences: Status vs Active

```
                APPROVAL STATUS          ACTIVE STATUS
                (vendor.status)          (vendor.is_active)
────────────────────────────────────────────────────────
CONTROLS        Approval workflow        Current access level
VALUES          PENDING_APPROVAL         true / false
                ACTIVE                   (Active / Inactive)
                REJECTED

SET BY          Admin (Approve/Reject)   Admin (Toggle button)
WHEN            During signup approval   Anytime after approval

AFFECTS LOGIN   YES                      YES
                (both checks required)   (both checks required)

EXAMPLE         ────────────────────────────────────────
                Status: ACTIVE
                Active: TRUE
                ✓ Can login

                Status: ACTIVE
                Active: FALSE
                ✗ Cannot login (suspended)

                Status: PENDING
                Active: TRUE
                ✗ Cannot login (not approved)

                Status: REJECTED
                Active: FALSE
                ✗ Cannot login (rejected)
```

---

## Button Actions & Menus

### Dropdown Menu - PENDING Vendors
```
For vendors with status = "⏳ PENDING_APPROVAL"

┌──────────────────────────────────────┐
│ [▼] Click to expand                  │
└──────────────────────────────────────┘
           ↓ Opens ↓
┌──────────────────────────────────────┐
│ ✓ Approve Vendor                     │
│   Changes status → ACTIVE            │
│   User is_active → true              │
│   Vendor can login after this        │
├──────────────────────────────────────┤
│ ✕ Reject Vendor                      │
│   Changes status → REJECTED          │
│   Deactivates all vendor users       │
│   Vendor cannot login                │
└──────────────────────────────────────┘
```

### Dropdown Menu - ACTIVE Vendors
```
For vendors with status = "✓ ACTIVE"

┌──────────────────────────────────────┐
│ [▼] Click to expand                  │
└──────────────────────────────────────┘
           ↓ Opens ↓
┌──────────────────────────────────────┐
│ ✎ Edit Vendor                        │
│   Opens modal to edit vendor details  │
├──────────────────────────────────────┤
│ +👤 Add User                         │
│   Creates new vendor user account    │
│   (different from vendor record)     │
└──────────────────────────────────────┘
```

### Active Status Toggle Button
```
Current: ACTIVE              Current: INACTIVE
┌──────────────────────┐    ┌──────────────────────┐
│  🟢 Active          │    │  ⭕ Inactive        │
│  (Click to disable) │    │  (Click to enable)  │
└──────────────────────┘    └──────────────────────┘
       ↓                          ↓
    Confirms               Confirms
       ↓                          ↓
  is_active → false          is_active → true
       ↓                          ↓
  Cannot login            Can login (if status=ACTIVE)
```

---

## Color & Icon Legend

| Icon | Color | Meaning |
|------|-------|---------|
| ⏳ | Yellow | Pending Approval |
| ✓ | Green | Approved/Active |
| ✕ | Red | Rejected/Failed |
| 🟢 | Green | Active/Enabled |
| ⭕ | Gray | Inactive/Disabled |
| ▼ | Gray | Dropdown Menu |
| [X] | - | Checkbox |
| ✓ | Green | Success Message |

---

## Status Transitions

```
VENDOR SIGNUP FLOW:

Vendor signs up
       ↓
Status: PENDING_APPROVAL
Active: Inactive (false)
       ↓
[ADMIN DECISION]
       ├→ Click [Approve]
       │    ↓
       │    Status: ACTIVE
       │    Active: true (auto-enabled)
       │    ↓
       │    ✓ Vendor can now login
       │    
       └→ Click [Reject]
            ↓
            Status: REJECTED
            Active: false
            ↓
            ✗ Vendor cannot login


DURING ACTIVE PERIOD:

Status: ACTIVE, Active: true
       ↓
Admin can:
├→ [Edit] Vendor details
├→ [Add User] Create vendor users
└→ Click [🟢 Active] to deactivate
   ↓
   Status: ACTIVE (unchanged)
   Active: false (disabled)
   ↓
   ✗ Vendor cannot login
   
   Can reactivate by clicking [⭕ Inactive]
   Status: ACTIVE
   Active: true
   ✓ Vendor can login again
```

---

## Toast Messages

### Success Messages (Green, Auto-dismiss 3s)
```
✓ Vendor approved successfully!
✓ Vendor rejected successfully
✓ Vendor activated successfully
✓ Vendor deactivated successfully
✓ Vendor created successfully
✓ Vendor updated successfully
✓ Vendor user created successfully
```

### Error Messages (Red, Dismissible)
```
✗ Vendor not found
✗ Email already exists
✗ Invalid vendor data
✗ Network error
✗ Authorization failed
```

---

## Performance Tips for Admin

1. **Use filters** to focus on what you need to process
   - Processing pending approvals? Click "Pending" tab
   - Looking for a specific active vendor? Click "Active" tab

2. **Use the dropdown menu** instead of scrolling
   - Much faster than looking at inline buttons

3. **Bulk select** vendors (when feature available)
   - Check multiple vendors to process them together

4. **Read the confirmations** carefully
   - Different actions have different effects

5. **Use status bar counts** to prioritize
   - If 5 vendors are pending, process them first

---

## Common Mistakes to Avoid

❌ **Mistake 1**: Clicking "🟢 Active" thinking it rejects vendor
   ✓ **Correct**: That temporarily disables access, doesn't reject
   
❌ **Mistake 2**: Approving vendor but not realizing they still can't login
   ✓ **Correct**: Both status=ACTIVE AND active=true are required
   
❌ **Mistake 3**: Rejecting vendor when you meant to deactivate
   ✓ **Correct**: Use dropdown [Reject] for rejections
               Use button [🟢 Active] for temp. suspension
   
❌ **Mistake 4**: Can't find pending vendors
   ✓ **Correct**: Click "Pending" tab to filter them
   
❌ **Mistake 5**: Dismissing success message too quickly
   ✓ **Correct**: Messages auto-dismiss, you don't need to click

---

This page makes vendor management faster and more intuitive! 🚀
