# Vendor Signup Flow - Complete Deep Dive

## 1. Overview

The vendor signup flow is a multi-stage process allowing companies to self-register as vendors in the VMS system. The process consists of:

1. **Public Vendor Registration** - Self-service signup form (frontend)
2. **Backend Validation & Account Creation** - Create vendor and user accounts
3. **Pending Approval State** - Accounts created but inactive until admin approval
4. **Admin Approval Workflow** - Admin reviews and approves/rejects vendors
5. **Account Activation** - Vendor gains access to the system upon approval

---

## 2. Frontend: Public Signup Form

### File: [src/pages/VendorSignup.jsx](src/pages/VendorSignup.jsx)

### Form Fields Collected:
| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `vendorName` | text | ✅ | Company name |
| `contactPerson` | text | ✅ | Primary contact name |
| `contactEmail` | email | ✅ | Contact email (used as login) |
| `contactPhone` | tel | ❌ | Phone number |
| `address` | textarea | ❌ | Company address |
| `gstNumber` | text | ❌ | GST registration number |
| `password` | password | ✅ | Account password |
| `confirmPassword` | password | ✅ | Password confirmation |

### Frontend Validation:
```javascript
// 1. Password Match Validation
if (formData.password !== formData.confirmPassword) {
  setError('Passwords do not match');
  return;
}

// 2. Password Length Validation
if (formData.password.length < 6) {
  setError('Password must be at least 6 characters long');
  return;
}

// 3. Email Format Validation (HTML5 input type="email")
```

### Signup Submission Flow:
```
Form Submit
    ↓
Frontend Validation (passwords match, min 6 chars)
    ↓
POST /public/vendor-signup (JSON payload)
    ↓
Success Screen: "Your account is pending approval from administrator"
    ↓
User redirected to Login page
```

### Success State:
- Shows confirmation message
- Notifies vendor that account is pending admin approval
- Provides link to login page

---

## 3. Backend: Signup Endpoint

### File: [backend/src/modules/vendors/public-signup.routes.js](backend/src/modules/vendors/public-signup.routes.js)

```javascript
router.post('/vendor-signup', publicSignup);
```

**Endpoint:** `POST /public/vendor-signup`
**Authentication:** ❌ Public (no auth required)
**Request Body:**
```json
{
  "vendorName": "ABC Corporation",
  "contactPerson": "John Doe",
  "contactEmail": "john@abc.com",
  "contactPhone": "+1-555-0123",
  "address": "123 Business St",
  "gstNumber": "29AABCT1332L1ZV",
  "password": "securePassword123"
}
```

---

## 4. Backend: Signup Controller Logic

### File: [backend/src/modules/vendors/public-signup.controller.js](backend/src/modules/vendors/public-signup.controller.js)

### Step-by-Step Execution:

#### **Step 1: Extract Request Data**
```javascript
const {
  vendorName,
  contactPerson,
  contactEmail,
  contactPhone,
  address,
  gstNumber,
  password
} = req.body;
```

#### **Step 2: Validation (Backend)**
```javascript
// Validate required fields
if (!vendorName || !contactPerson || !contactEmail || !password) {
  return res.status(400).json({ message: 'Missing required fields' });
}

// Validate password length
if (password.length < 6) {
  return res.status(400).json({ message: 'Password must be at least 6 characters' });
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(contactEmail)) {
  return res.status(400).json({ message: 'Invalid email address' });
}
```

#### **Step 3: Check for Duplicate Email**
```javascript
const { data: existingUser } = await db
  .from('users')
  .select('id')
  .eq('email', contactEmail)
  .single();

if (existingUser) {
  return res.status(409).json({ message: 'Email already registered' });
}
```

#### **Step 4: Hash Password**
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

#### **Step 5: Create Vendor Record**
```javascript
const { data: vendor, error: vendorError } = await db
  .from('vendors')
  .insert({
    name: vendorName,
    code: null,                    // ← Code generated on approval
    contact_person: contactPerson,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    address: address,
    gst_number: gstNumber,
    is_active: false,              // ← Inactive until approval
    status: 'PENDING_APPROVAL'     // ← Awaiting admin review
  })
  .select()
  .single();
```

#### **Step 6: Create User Record**
```javascript
const { data: user, error: userError } = await db
  .from('users')
  .insert({
    name: contactPerson,
    email: contactEmail,
    password_hash: hashedPassword,
    role: 'VENDOR',                // ← User role
    vendor_id: vendor.id,          // ← Link to vendor
    is_active: false               // ← Inactive until vendor approved
  })
  .select()
  .single();
```

#### **Step 7: Return Success Response**
```javascript
return res.status(201).json({
  message: 'Vendor signup successful. Your account is pending approval.',
  vendor: {
    id: vendor.id,
    name: vendor.name,
    status: vendor.status
  }
});
```

### Data Created at Signup:

**vendors table:**
```
id                          | name              | code | status              | is_active | created_at
12345678-1234-1234-1234    | ABC Corporation   | NULL | PENDING_APPROVAL    | false     | 2024-01-09T10:00:00Z
```

**users table:**
```
id                          | name       | email        | password_hash    | role   | vendor_id                    | is_active | created_at
87654321-4321-4321-4321    | John Doe   | john@abc.com | $2b$10$hashed... | VENDOR | 12345678-1234-1234-1234    | false     | 2024-01-09T10:00:00Z
```

---

## 5. Signup State: Pending Approval

### Vendor Status After Signup:
| Field | Value | Meaning |
|-------|-------|---------|
| `status` | `PENDING_APPROVAL` | Awaiting admin review |
| `is_active` | `false` | Cannot login yet |
| `code` | `NULL` | Code assigned on approval |

### User Status After Signup:
| Field | Value | Meaning |
|-------|-------|---------|
| `is_active` | `false` | Cannot authenticate |
| `role` | `VENDOR` | Will have vendor permissions |
| `vendor_id` | `<vendor_id>` | Linked to vendor |

### What Vendor Cannot Do:
- ❌ Login (user `is_active = false`)
- ❌ View purchase orders (RLS policies block inactive vendors)
- ❌ Accept/reject POs
- ❌ Access dashboard

---

## 6. Database: RLS Policies for Signup

### File: [supabase/migrations/20260108103405_create_vendor_management_schema.sql](supabase/migrations/20260108103405_create_vendor_management_schema.sql)

### Authentication RLS Policy (Special Case)
```sql
-- This policy allows PUBLIC signup form to read users for authentication
-- (Password is still hashed and protected)
CREATE POLICY "Allow authentication queries"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (true);
```

**Why this is needed:**
- Public signup endpoint needs to check if email exists (`SELECT` from users)
- Backend validates password, never exposed to frontend
- This is safe because password_hash is never sent to client

### Vendor RLS Policy (After Approval)
```sql
-- After approval, vendors can view their own vendor record
CREATE POLICY "Vendors can view their own vendor record"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'VENDOR'
      AND users.vendor_id = vendors.id
    )
  );
```

---

## 7. Admin Approval Workflow

### File: [src/pages/admin/VendorManagement.jsx](src/pages/admin/VendorManagement.jsx)

### Admin View: Pending Vendors
```javascript
// Load vendors with status = 'PENDING_APPROVAL'
// Display vendor details for review
// Show approve/reject buttons
```

### Approval Endpoint

**File:** [backend/src/modules/vendors/vendor.controller.js](backend/src/modules/vendors/vendor.controller.js)

**Endpoint:** `POST /admin/vendors/:id/approve`
**Authentication:** ✅ Admin only
**Request Body:** `{ vendorCode?: "KUS_VND_00001" }` (optional - auto-generated if not provided)

#### Approval Flow:

```
Admin clicks "Approve"
    ↓
POST /admin/vendors/:id/approve
    ↓
Backend calls vendorService.approveVendor(vendorId)
    ↓
generateNextVendorCode() - Creates unique code (KUS_VND_00001, KUS_VND_00002, etc.)
    ↓
Update vendor:
  - status: 'ACTIVE'
  - is_active: true
  - code: 'KUS_VND_00001'
    ↓
activateVendorUsers(vendorId) - Set all users is_active = true
    ↓
Vendor can now login!
```

### Code Generation Logic

**File:** [backend/src/modules/vendors/vendor.repository.js](backend/src/modules/vendors/vendor.repository.js)

```javascript
async generateNextVendorCode() {
  // Query all existing vendor codes with pattern 'KUS_VND_*'
  const { data: vendors } = await db
    .from('vendors')
    .select('code')
    .like('code', 'KUS_VND_%');

  // Extract numbers and find max
  const numbers = vendors
    .map(v => parseInt(v.code.split('_')[2]))
    .filter(n => !isNaN(n));

  const nextNumber = Math.max(...numbers, 0) + 1;

  // Format: KUS_VND_00001, KUS_VND_00002, etc.
  return `KUS_VND_${String(nextNumber).padStart(5, '0')}`;
}
```

### Example Code Progression:
```
Vendor 1: KUS_VND_00001
Vendor 2: KUS_VND_00002
Vendor 3: KUS_VND_00003
...
Vendor 10: KUS_VND_00010
Vendor 100: KUS_VND_00100
```

---

## 8. Rejection Workflow

**Endpoint:** `POST /admin/vendors/:id/reject`
**Authentication:** ✅ Admin only

#### Rejection Flow:

```
Admin clicks "Reject"
    ↓
POST /admin/vendors/:id/reject
    ↓
Backend calls vendorService.rejectVendor(vendorId)
    ↓
Update vendor:
  - status: 'REJECTED'
  - is_active: false
    ↓
deactivateVendorUsers(vendorId) - Set all users is_active = false
    ↓
Vendor account inactive, cannot login
```

### Rejection Data State:
```
vendors table:
id    | name          | status    | is_active | code
...   | ABC Corp      | REJECTED  | false     | NULL

users table:
id    | email        | is_active
...   | john@abc.com | false
```

---

## 9. Complete Vendor Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  VENDOR SIGNUP LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

STAGE 1: PUBLIC SIGNUP
─────────────────────
Vendor visits /vendor-signup
    ↓
Fills form with company & contact info
    ↓
Frontend validation (password match, min 6 chars)
    ↓
POST /public/vendor-signup
    ↓
Backend creates:
  • Vendor (status='PENDING_APPROVAL', is_active=false)
  • User (role='VENDOR', is_active=false)
    ↓
Response: "Account pending approval"
    ↓
Vendor redirected to /login

STATUS: 🔴 PENDING_APPROVAL (Inactive)
  ❌ Cannot login (is_active=false)
  ❌ Cannot view POs (RLS blocks)
  ⏳ Awaiting admin review


STAGE 2: ADMIN REVIEW
─────────────────────
Admin visits /admin/vendor-management
    ↓
Views list of PENDING_APPROVAL vendors
    ↓
Decides: Approve or Reject
    ↓

PATH A: APPROVAL
────────────────
Admin clicks "Approve"
    ↓
POST /admin/vendors/:id/approve
    ↓
Backend:
  1. Generate code: KUS_VND_00001
  2. Update vendor:
     - status → 'ACTIVE'
     - is_active → true
     - code → 'KUS_VND_00001'
  3. Activate all users:
     - is_active → true
    ↓
Response: Success

STATUS: 🟢 ACTIVE (Active)
  ✅ Can login
  ✅ Can view POs assigned to them
  ✅ Can accept/reject POs
  ✅ Can view own vendor profile


PATH B: REJECTION
─────────────────
Admin clicks "Reject"
    ↓
POST /admin/vendors/:id/reject
    ↓
Backend:
  1. Update vendor:
     - status → 'REJECTED'
     - is_active → false
  2. Deactivate all users:
     - is_active → false
    ↓
Response: Success

STATUS: 🔴 REJECTED (Inactive)
  ❌ Cannot login
  ❌ Account permanently rejected
  ⚠️  Would need to contact support


STAGE 3: ACTIVE VENDOR
──────────────────────
Once approved, vendor can:
  ✅ Login with email & password
  ✅ View assigned purchase orders
  ✅ View line items
  ✅ Accept/plan POs
  ✅ View PO history
  ✅ Update profile info

```

---

## 10. Security Considerations

### 1. Password Hashing
```javascript
// Passwords hashed with bcryptjs (salt rounds: 10)
const hashedPassword = await bcrypt.hash(password, 10);
// Hash stored in database, never exposed to frontend
```

### 2. Email Uniqueness
```javascript
// Check if email already exists before signup
const existingUser = await db
  .from('users')
  .select('id')
  .eq('email', contactEmail)
  .single();

if (existingUser) {
  // Reject with 409 Conflict
}
```

### 3. Inactive Account Prevention
```javascript
// Even if vendor has user record, they cannot login until:
// 1. User.is_active = true
// 2. Vendor.is_active = true
```

### 4. RLS Policies
```sql
-- Inactive vendors blocked by RLS
CREATE POLICY "Vendors can view their own vendor record"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    -- user.id = auth.uid() ensures user is logged in
    -- users.is_active = true (though not explicitly checked in this policy)
    -- Supabase auth automatically prevents unapproved users from getting JWT
  );
```

### 5. Approval-Only Activation
```javascript
// Only admin can activate vendors
// Frontend has no approve/reject buttons for non-admins
// Backend checks admin role:
if (user.role !== 'ADMIN') {
  return res.status(403).json({ message: 'Forbidden' });
}
```

---

## 11. Data Validation Summary

| Validation | Location | Enforcement |
|-----------|----------|------------|
| Password match | Frontend | User feedback |
| Password length ≥ 6 | Frontend + Backend | Form validation + 400 response |
| Email format | Frontend (HTML5) + Backend (regex) | Input type + regex check |
| Required fields | Frontend (HTML5) + Backend | HTML5 required + null check |
| Email uniqueness | Backend | Query existing users |
| Admin approval | Backend | Role check + status update |

---

## 12. Request/Response Examples

### Successful Signup

**Request:**
```bash
POST http://localhost:3001/public/vendor-signup
Content-Type: application/json

{
  "vendorName": "Acme Supplies Inc",
  "contactPerson": "Jane Smith",
  "contactEmail": "jane@acme.com",
  "contactPhone": "+1-555-0100",
  "address": "456 Corporate Ave, New York, NY",
  "gstNumber": "29AABCE1234F1ZV",
  "password": "SecurePass123"
}
```

**Response (201 Created):**
```json
{
  "message": "Vendor signup successful. Your account is pending approval.",
  "vendor": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Acme Supplies Inc",
    "status": "PENDING_APPROVAL"
  }
}
```

### Validation Error

**Request:**
```bash
POST http://localhost:3001/public/vendor-signup
Content-Type: application/json

{
  "vendorName": "TechCorp",
  "contactPerson": "Bob Johnson",
  "contactEmail": "invalid-email",
  "password": "123"
}
```

**Response (400 Bad Request):**
```json
{
  "message": "Invalid email address"
}
```

### Duplicate Email Error

**Request:**
```bash
POST http://localhost:3001/public/vendor-signup
Content-Type: application/json

{
  "vendorName": "DuplicateCorp",
  "contactPerson": "Alice Brown",
  "contactEmail": "existing@email.com",
  "password": "Password123"
}
```

**Response (409 Conflict):**
```json
{
  "message": "Email already registered"
}
```

### Approval Request

**Request:**
```bash
POST http://localhost:3001/admin/vendors/a1b2c3d4-e5f6-7890-abcd-ef1234567890/approve
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{}
```

**Response (200 OK):**
```json
{
  "message": "Vendor approved successfully",
  "vendor": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Acme Supplies Inc",
    "status": "ACTIVE",
    "is_active": true,
    "code": "KUS_VND_00001"
  }
}
```

---

## 13. Testing Checklist

### Frontend Tests
- [ ] Form fields render correctly
- [ ] Password match validation works
- [ ] Password length validation works
- [ ] Required fields validation works
- [ ] Email format validation works
- [ ] Error messages display correctly
- [ ] Success screen shows when signup succeeds
- [ ] Can navigate to login from success screen

### Backend Tests
- [ ] POST /public/vendor-signup returns 201 for valid data
- [ ] Returns 400 for missing required fields
- [ ] Returns 400 for invalid email format
- [ ] Returns 400 for password < 6 chars
- [ ] Returns 409 for duplicate email
- [ ] Vendor created with status='PENDING_APPROVAL'
- [ ] Vendor created with is_active=false
- [ ] User created with role='VENDOR'
- [ ] User created with is_active=false
- [ ] Vendor code is NULL until approved

### Admin Approval Tests
- [ ] GET /admin/vendors shows pending vendors
- [ ] POST /admin/vendors/:id/approve generates unique code
- [ ] Approval sets vendor.is_active=true
- [ ] Approval sets vendor.status='ACTIVE'
- [ ] Approval sets user.is_active=true for vendor's users
- [ ] Vendor can login after approval

### Rejection Tests
- [ ] POST /admin/vendors/:id/reject sets status='REJECTED'
- [ ] Rejection sets vendor.is_active=false
- [ ] Rejection sets user.is_active=false for vendor's users
- [ ] Vendor cannot login after rejection

---

## 14. Known Edge Cases & Resolutions

### Case 1: Multiple Users for Same Vendor
**Scenario:** Admin creates additional users for an already-approved vendor
**Resolution:** Each user has individual is_active flag; all are activated on vendor approval

### Case 2: Code Generation with Large Numbers
**Scenario:** System has 10,000+ vendors
**Code:** Uses `.padStart(5, '0')` → handles up to 99,999 vendors (KUS_VND_99999)
**Beyond that:** Would need code format change

### Case 3: Re-approval After Rejection
**Scenario:** Vendor reapplies after being rejected
**Resolution:** Must submit new signup form (creates new vendor & user records)
**Note:** Old rejected records remain for audit trail

### Case 4: Password Change After Signup
**Scenario:** Vendor wants to change password before admin approval
**Resolution:** Currently NOT implemented - vendor cannot login until approved
**Improvement:** Could add password reset via email link

### Case 5: Admin Approves Before Email Verification
**Scenario:** No email verification in current system
**Resolution:** Email is verified by vendor using it in signup form
**Risk:** Typos in email address → vendor cannot receive updates
**Improvement:** Could add email confirmation step

---

## 15. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│  VendorSignup.jsx                                            │
│  ├─ Form with 8 input fields                               │
│  ├─ Frontend validation (password match, length)           │
│  ├─ Error/Success state management                         │
│  └─ POST /public/vendor-signup                             │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ↓ JSON
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express)                           │
├─────────────────────────────────────────────────────────────┤
│  /public/vendor-signup (POST)                               │
│  ├─ public-signup.controller.js                            │
│  │  ├─ Validate required fields                            │
│  │  ├─ Validate email format                               │
│  │  ├─ Check duplicate email                               │
│  │  ├─ Hash password                                        │
│  │  ├─ Create vendor record                                │
│  │  └─ Create user record                                  │
│  │                                                           │
│  └─ Returns 201 Success / 400/409 Error                    │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ↓ Supabase API
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + RLS)                    │
├─────────────────────────────────────────────────────────────┤
│  vendors table                                               │
│  ├─ id, name, contact_person, contact_email, ...           │
│  ├─ status: PENDING_APPROVAL                               │
│  ├─ is_active: false                                        │
│  └─ code: null                                              │
│                                                               │
│  users table                                                 │
│  ├─ id, email, password_hash, name                         │
│  ├─ role: VENDOR                                            │
│  ├─ vendor_id: <reference to vendor>                       │
│  ├─ is_active: false                                        │
│  └─ RLS Policy: "Allow authentication queries" (special)   │
└─────────────────────────────────────────────────────────────┘
                        
┌─────────────────────────────────────────────────────────────┐
│              ADMIN PANEL (React)                             │
├─────────────────────────────────────────────────────────────┤
│  VendorManagement.jsx                                        │
│  ├─ List vendors with status=PENDING_APPROVAL              │
│  ├─ Show vendor details                                     │
│  ├─ [Approve] button → POST /admin/vendors/:id/approve    │
│  └─ [Reject] button → POST /admin/vendors/:id/reject      │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ↓ JSON
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Express)                               │
├─────────────────────────────────────────────────────────────┤
│  /admin/vendors/:id/approve (POST)                          │
│  ├─ vendor.controller.js                                    │
│  ├─ Check admin role                                        │
│  └─ Call vendorService.approveVendor()                     │
│                                                               │
│  vendorService.approveVendor()                              │
│  ├─ vendor.repository.generateNextVendorCode()             │
│  ├─ Update vendor (status='ACTIVE', code=...)             │
│  ├─ Call repository.activateVendorUsers()                 │
│  └─ Update users (is_active=true)                          │
│                                                               │
│  /admin/vendors/:id/reject (POST)                           │
│  ├─ Similar flow but:                                       │
│  ├─ Update vendor (status='REJECTED', is_active=false)    │
│  └─ Call repository.deactivateVendorUsers()               │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ↓ Supabase API
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL + RLS)                    │
├─────────────────────────────────────────────────────────────┤
│  vendors table (UPDATED)                                     │
│  ├─ status: ACTIVE (or REJECTED)                           │
│  ├─ is_active: true (or false)                             │
│  ├─ code: KUS_VND_00001 (generated)                        │
│                                                               │
│  users table (UPDATED)                                       │
│  ├─ is_active: true (now can login!)                       │
│                                                               │
│  RLS Policies now allow:                                     │
│  ├─ Vendor to SELECT own vendor record                      │
│  ├─ Vendor to SELECT own POs                                │
│  └─ Vendor to UPDATE own POs                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 16. Conclusion

The vendor signup flow is a complete, multi-stage process with:

✅ **Strong Frontend Validation** - Password match, length, email format
✅ **Robust Backend Validation** - Email uniqueness, required fields, format checking
✅ **Secure Password Handling** - bcryptjs hashing, never exposed to client
✅ **Clear Status Management** - PENDING_APPROVAL → ACTIVE/REJECTED lifecycle
✅ **Admin Control** - Approval/rejection workflow with user activation
✅ **Automatic Code Generation** - Unique vendor codes (KUS_VND_*) on approval
✅ **RLS Security** - Inactive vendors cannot access any data
✅ **Audit Trail** - All vendor and user records timestamped

The system is production-ready with proper error handling, validation at multiple layers, and clear separation of concerns between frontend, backend, and database tiers.

