# Vendor Signup and Approval Flow - Complete Documentation

## Overview
The system includes a complete vendor registration and approval workflow that allows vendors to self-register while giving admins control over who can access the system.

## Features Implemented

### 1. Public Vendor Signup
- **Route**: `/vendor-signup` (accessible without login)
- **Access**: From login page, click "Register here" under "New vendor?"
- **Form Fields**:
  - Vendor Name (required)
  - Contact Person (required)
  - Contact Email (required)
  - Contact Phone (optional)
  - Address (optional)
  - GST Number (optional)
  - Password (required, minimum 6 characters)
  - Confirm Password (required)

### 2. Signup Process
When a vendor submits the signup form:
1. Backend creates a new vendor record with:
   - `status: 'PENDING_APPROVAL'`
   - `is_active: false`
   - `code: null` (will be auto-generated on approval)
2. Backend creates a user account with:
   - `role: 'VENDOR'`
   - `is_active: false`
   - Password is hashed with bcrypt
3. Success message displayed to vendor
4. Vendor is redirected to login page

### 3. Admin Approval Interface
**Location**: `/admin/vendors` (Vendor Management page)

The table displays all vendors with the following columns:
- Vendor Name
- Code (shows "-" for pending vendors, auto-generated code for approved)
- Contact Person
- Contact Email
- Phone
- GST Number
- **Approval Status**:
  - Yellow badge: "Pending" (PENDING_APPROVAL)
  - Green badge: "ACTIVE"
  - Red badge: "REJECTED"
- **Active Status**: Shows if vendor/users are active
- **Actions**: Context-aware action buttons

### 4. Admin Actions

#### For PENDING_APPROVAL Vendors:
- **Approve Button** (Green with checkmark icon):
  - Auto-generates vendor code in format `KUS_VND_00001` (incremental)
  - Sets vendor status to 'ACTIVE'
  - Sets vendor is_active to true
  - Activates all associated user accounts
  - Shows success message with code generation confirmation

- **Reject Button** (Red with X icon):
  - Sets vendor status to 'REJECTED'
  - Sets vendor is_active to false
  - Deactivates all associated user accounts
  - Shows confirmation message

#### For ACTIVE Vendors:
- **Edit Button**: Modify vendor details
- **Add User Button**: Create additional user accounts for this vendor

#### For REJECTED Vendors:
- No actions available (displays "No actions available")

### 5. Auto Vendor Code Generation
The system automatically generates unique vendor codes when approving:
- Format: `KUS_VND_XXXXX` (5-digit number with leading zeros)
- Starts from: `KUS_VND_00001`
- Auto-increments: Checks highest existing code and adds 1
- Example sequence:
  - First vendor: `KUS_VND_00001`
  - Second vendor: `KUS_VND_00002`
  - Third vendor: `KUS_VND_00003`

### 6. Login Restrictions
The login system enforces strict approval checks:

**For All Users:**
- Checks if `user.is_active = true`
- If false: Shows error "Your account is not active. Please contact the administrator."

**For Vendor Users (additional check):**
- Checks if `vendor.status = 'ACTIVE'`
- If not: Shows error "Your vendor account is pending approval or has been rejected."

**Result:**
- ✅ Approved vendors (ACTIVE status, is_active = true): Can login
- ❌ Pending vendors (PENDING_APPROVAL): Cannot login
- ❌ Rejected vendors (REJECTED status): Cannot login
- ❌ Inactive vendors: Cannot login

### 7. Backend Security
All vendor approval endpoints require:
- Valid JWT authentication
- ADMIN role authorization
- Located at `/admin/vendors/:id/approve` and `/admin/vendors/:id/reject`

## Complete User Journey

### Vendor Registration Flow:
1. Vendor visits login page
2. Clicks "Register here" link
3. Fills out signup form with company and contact details
4. Submits form
5. Sees success message: "Your vendor account has been created successfully. Your account is pending approval from the administrator."
6. Cannot login yet (account inactive)

### Admin Approval Flow:
1. Admin logs into system
2. Navigates to Vendor Management page
3. Sees pending vendor with yellow "Pending" badge
4. Reviews vendor information
5. Clicks "Approve" button
6. Confirms approval in dialog
7. System auto-generates vendor code (e.g., `KUS_VND_00001`)
8. Vendor status changes to "ACTIVE" with green badge
9. Vendor and all their users become active

### Vendor Login After Approval:
1. Vendor receives approval notification (manually, as email isn't implemented)
2. Goes to login page
3. Enters email and password
4. Successfully logs in
5. Redirected to vendor dashboard
6. Can now view and manage POs assigned to them

## API Endpoints

### Public Endpoint (No Auth Required):
- `POST /public/vendor-signup` - Vendor self-registration

### Admin Endpoints (Require Admin Auth):
- `GET /admin/vendors` - List all vendors
- `POST /admin/vendors/:id/approve` - Approve vendor
- `POST /admin/vendors/:id/reject` - Reject vendor
- `POST /admin/vendors` - Create vendor manually
- `PUT /admin/vendors/:id` - Update vendor
- `POST /admin/vendors/:id/user` - Create user for vendor

## Database Changes

### Vendors Table:
- `status` column: 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED'
- `code` column: Auto-generated on approval (format: KUS_VND_XXXXX)
- `is_active` column: Controls access
- New vendors start with `status='PENDING_APPROVAL'`, `is_active=false`, `code=null`

### Users Table:
- Vendor users created during signup have `is_active=false`
- Activated when vendor is approved
- Deactivated when vendor is rejected

## Testing the Flow

### Test Vendor Signup:
1. Visit: `http://localhost:5173/vendor-signup`
2. Fill form with test data:
   - Vendor Name: "Test Vendor Inc"
   - Contact Person: "John Smith"
   - Contact Email: "john@testvendor.com"
   - Password: "test123"
3. Submit and verify success message
4. Attempt login - should fail with approval pending message

### Test Admin Approval:
1. Login as admin
2. Go to Vendor Management
3. Find "Test Vendor Inc" with "Pending" status
4. Click "Approve"
5. Verify vendor code is generated
6. Verify status changes to "ACTIVE"

### Test Vendor Login After Approval:
1. Logout
2. Login with vendor credentials (john@testvendor.com / test123)
3. Should successfully login to vendor dashboard

## Security Features
✅ Password hashing with bcrypt
✅ JWT authentication for API access
✅ Role-based access control
✅ Approval workflow prevents unauthorized access
✅ Inactive accounts cannot login
✅ Public signup endpoint is unauthenticated
✅ All admin functions require ADMIN role

## Future Enhancements (Not Implemented)
- Email notifications on approval/rejection
- Vendor can resubmit after rejection
- Admin can add notes when rejecting
- Bulk approve/reject functionality
- Vendor registration email verification
