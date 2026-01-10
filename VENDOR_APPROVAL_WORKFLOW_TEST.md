# Vendor Approval Workflow - Testing Checklist

## Changes Made

### 1. **Backend - Public Signup Controller** ✅
- **File**: `backend/src/modules/vendors/public-signup.controller.js`
- **Change**: Generate vendor code before inserting vendor
- **What it fixes**: Prevents NULL constraint violation on `vendors.code`
- **Code**:
  ```javascript
  const vendorCode = await generateNextVendorCode();
  const { data: vendorData, error: vendorError } = await db
    .from('vendors')
    .insert([{
      name: vendorName,
      // ... other fields
      status: 'PENDING_APPROVAL',  // Set status to pending
      is_active: false,             // User not active until approved
      code: vendorCode              // Generated code (non-null)
    }])
  ```

### 2. **Frontend - Layout Component** ✅
- **File**: `src/components/Layout.jsx`
- **Changes**:
  - Derive role from authenticated user when no `role` prop passed
  - Improved active-link matching for subroutes
- **Code**:
  ```javascript
  const resolvedRole = role || (user?.role === 'ADMIN' ? 'admin' : 'vendor');
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  ```

### 3. **Frontend - VendorManagement Page** ✅
- **File**: `src/pages/admin/VendorManagement.jsx`
- **Change**: Pass `role="admin"` to Layout component
- **Before**: `<Layout>`
- **After**: `<Layout role="admin">`

### 4. **Database Migration** ✅
- **File**: `supabase/migrations/20260110000000_add_vendor_status_column.sql`
- **Adds**: `status` column with CHECK constraint
- **Note**: Previous migration `20260109053815` also adds these columns

---

## Vendor Approval Workflow Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VENDOR SIGNS UP                                          │
├─────────────────────────────────────────────────────────────┤
│ Frontend: POST /public/vendor-signup                        │
│ Backend: public-signup.controller.js                        │
│ - Generate vendor code (KUS_VND_XXXXX)                     │
│ - Create vendor with status='PENDING_APPROVAL'             │
│ - Create user with is_active=false                         │
│ Database: vendors table + users table                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ADMIN VIEWS VENDORS                                      │
├─────────────────────────────────────────────────────────────┤
│ Route: /admin/vendors                                       │
│ Component: VendorManagement.jsx (role="admin")             │
│ - Lists all vendors with status badges                      │
│ - Shows "Approve" & "Reject" buttons for PENDING vendors   │
│ API: GET /admin/vendors                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ADMIN APPROVES VENDOR                                    │
├─────────────────────────────────────────────────────────────┤
│ Frontend: api.admin.approveVendor(vendorId)               │
│ Backend: POST /admin/vendors/:id/approve                   │
│ - vendor.service.js: approveVendor()                       │
│   * Generates new vendor code                              │
│   * Updates vendor.status = 'ACTIVE'                       │
│   * Updates vendor.is_active = true                        │
│   * Activates all vendor users (is_active = true)          │
│ Database: vendors & users tables updated                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VENDOR LOGS IN                                           │
├─────────────────────────────────────────────────────────────┤
│ Frontend: POST /auth/login                                  │
│ Backend: auth.service.js: login()                          │
│ Checks:                                                     │
│ - user.is_active === true ✅                               │
│ - vendor.status === 'ACTIVE' ✅                            │
│ Returns: JWT token with user info                          │
│ Vendor can now access /vendor/dashboard                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Cases

### Test 1: Vendor Signup
- [ ] Go to `/vendor-signup`
- [ ] Fill form with valid data
- [ ] Submit
- **Expected**: Success message "Your account is pending approval from the admin"

### Test 2: Admin Views Pending Vendor
- [ ] Login as admin
- [ ] Navigate to `/admin/vendors`
- [ ] Find newly signed-up vendor
- **Expected**: Vendor shows with status badge "Pending"
- **Expected**: Approve & Reject buttons visible

### Test 3: Admin Approves Vendor
- [ ] Click "Approve" button on pending vendor
- [ ] Confirm dialog
- **Expected**: Alert "Vendor approved successfully! A vendor code has been auto-generated."
- **Expected**: Vendor status changes to "Active"

### Test 4: Approved Vendor Can Login
- [ ] Open new browser/incognito
- [ ] Go to `/login`
- [ ] Use the vendor's email and password
- **Expected**: Login succeeds
- **Expected**: Redirected to `/vendor/dashboard`
- **Expected**: Vendor menu (Dashboard, Line Items, History) visible

### Test 5: Admin Rejects Vendor
- [ ] Create another test vendor signup
- [ ] Login as admin, navigate to `/admin/vendors`
- [ ] Click "Reject" on the pending vendor
- [ ] Confirm dialog
- **Expected**: Alert "Vendor rejected successfully."
- **Expected**: Vendor status changes to "Rejected"

### Test 6: Rejected Vendor Cannot Login
- [ ] Try to login with rejected vendor email/password
- **Expected**: Error "Your vendor account is pending approval or has been rejected."

### Test 7: Menu Navigation
- [ ] Login as admin
- [ ] Check top nav menu shows admin items (Dashboard, Line Items, History, Vendors)
- [ ] Click "Vendors" link
- **Expected**: Navigate to `/admin/vendors`
- **Expected**: "Vendors" menu item highlighted (blue background)
- [ ] Click "Dashboard"
- **Expected**: Navigate to `/admin/dashboard`
- **Expected**: "Dashboard" menu item now highlighted

### Test 8: Vendor Menu Navigation
- [ ] Login as approved vendor
- [ ] Check top nav menu shows vendor items (Dashboard, Line Items, History)
- [ ] Click "Line Items"
- **Expected**: Navigate to `/vendor/line-items`
- **Expected**: "Line Items" menu item highlighted

---

## Files Modified

| File | Status | Change |
|------|--------|--------|
| `src/components/Layout.jsx` | ✅ Modified | Role detection & active-link matching |
| `src/pages/admin/VendorManagement.jsx` | ✅ Modified | Added `role="admin"` prop |
| `backend/src/modules/vendors/public-signup.controller.js` | ✅ Modified | Generate vendor code on signup |
| `supabase/migrations/20260110000000_add_vendor_status_column.sql` | ✅ Created | Database schema migration |

---

## Verification Checklist

### Code Level
- [x] Vendor code generation implemented
- [x] Status set to PENDING_APPROVAL on signup
- [x] Approve function updates status to ACTIVE
- [x] Reject function updates status to REJECTED
- [x] User is_active flag checked in login
- [x] Vendor status checked in login
- [x] Layout role derivation from user.role
- [x] VendorManagement page passes role="admin"

### Database Level
- [ ] Vendors table has `status` column
- [ ] Vendors table has `is_active` column
- [ ] Users table has `is_active` column
- [ ] Status column has CHECK constraint

### Runtime Level
- [ ] Backend server running without errors
- [ ] Frontend serves correctly
- [ ] Vendor signup creates pending vendor
- [ ] Admin can approve vendor
- [ ] Approved vendor can login
- [ ] Rejected vendor cannot login

---

## Next Steps

1. **Run migrations** in Supabase dashboard
2. **Restart backend** to load updated code
3. **Restart frontend** (dev server)
4. **Run test cases** above in order
5. **Report any failures** with error messages

---

## Troubleshooting

### Issue: "null value in column status violates not-null constraint"
- **Solution**: Run the migration `20260110000000_add_vendor_status_column.sql`

### Issue: Vendor table update fails when approving
- **Solution**: Ensure vendors table has `status` column (migration applied)

### Issue: User cannot login after approval
- **Solution**: Check that users table has `is_active` column

### Issue: Wrong menu displays
- **Solution**: Ensure `role="admin"` is passed to Layout in admin pages

---
