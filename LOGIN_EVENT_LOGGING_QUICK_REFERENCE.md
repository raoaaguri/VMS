# Login Event Logging - Quick Reference Guide

## What's Logged

When a user logs in to the system, the backend now logs **event-based logs** at both the HTTP and service levels.

---

## ✅ SUCCESSFUL LOGIN FLOW

### Step 1: Request Received (Controller)
```
[a1b2c3] 🔐 LOGIN REQUEST RECEIVED
{
  email: "vendor@company.com",
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  timestamp: "2026-01-20T10:15:23Z"
}
```

### Step 2: Validation (Controller)
```
[a1b2c3] ✅ Input Validation Passed
{
  emailLength: 18,
  passwordLength: 12
}
```

### Step 3: Database Query (Service)
```
[a1b2c3] 🔎 Querying User from Database
{
  email: "vendor@company.com",
  timestamp: "2026-01-20T10:15:23Z"
}
```

### Step 4: User Found (Service)
```
[a1b2c3] ✅ User Found in Database
{
  userId: "user-123",
  userEmail: "vendor@company.com",
  userRole: "VENDOR",
  userActive: true,
  hasVendorId: true
}
```

### Step 5: Password Validation (Service)
```
[a1b2c3] 🔑 Validating Password
{
  userId: "user-123",
  email: "vendor@company.com"
}
```

```
[a1b2c3] ✅ Password Validation Successful
{
  userId: "user-123",
  email: "vendor@company.com"
}
```

### Step 6: Account Status Check (Service)
```
[a1b2c3] ✅ Account Active Status Verified
{
  userId: "user-123",
  email: "vendor@company.com"
}
```

### Step 7: Vendor Verification (Service - if VENDOR)
```
[a1b2c3] 🏢 Checking Vendor Approval Status
{
  userId: "user-123",
  vendorId: "vendor-456"
}
```

```
[a1b2c3] ✅ Vendor Approval Status Verified - ACTIVE
{
  userId: "user-123",
  vendorId: "vendor-456",
  vendorName: "TechCorp Inc"
}
```

### Step 8: Token Generation (Service)
```
[a1b2c3] 🎟️  Generating JWT Token
{
  userId: "user-123",
  email: "vendor@company.com",
  role: "VENDOR",
  expiresIn: "7d"
}
```

```
[a1b2c3] ✅ JWT Token Generated Successfully
{
  userId: "user-123",
  tokenLength: 487,
  tokenExpiresIn: "7d"
}
```

### Step 9: Service Completion (Service)
```
[a1b2c3] ✅ LOGIN SERVICE COMPLETED SUCCESSFULLY
{
  userId: "user-123",
  email: "vendor@company.com",
  role: "VENDOR",
  vendor_id: "vendor-456",
  duration: "185ms",
  timestamp: "2026-01-20T10:15:23Z"
}
```

### Step 10: SUCCESS EVENT - Service Level
```
[a1b2c3] 🎯 AUTHENTICATION SERVICE EVENT
{
  eventType: "AUTH_SERVICE_SUCCESS",
  userId: "user-123",
  email: "vendor@company.com",
  role: "VENDOR",
  vendorId: "vendor-456",
  processSteps: [
    "User found in database",
    "Password validation passed",
    "Account active status verified",
    "Vendor approval status verified",
    "JWT token generated"
  ],
  tokenGenerated: true,
  duration: "185ms",
  timestamp: "2026-01-20T10:15:23Z"
}
```

### Step 11: SUCCESS EVENT - HTTP Level
```
[a1b2c3] ✅ LOGIN SUCCESSFUL
{
  userId: "user-123",
  email: "vendor@company.com",
  role: "VENDOR",
  vendor_id: "vendor-456",
  duration: "245ms",
  clientIp: "192.168.1.100",
  timestamp: "2026-01-20T10:15:23Z"
}
```

### Step 12: SUCCESS EVENT - Event Log
```
[a1b2c3] 📊 LOGIN EVENT CREATED ✅
{
  eventType: "USER_LOGIN_SUCCESS",
  userId: "user-123",
  email: "vendor@company.com",
  role: "VENDOR",
  vendorId: "vendor-456",
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  responseTime: "245ms",
  tokenIssued: true,
  timestamp: "2026-01-20T10:15:23Z",
  sessionCreated: true
}
```

**✅ Result: User receives JWT token and can access the system**

---

## ❌ FAILED LOGIN - INVALID PASSWORD

### Step 1: Request Received
```
[x8y9z0] 🔐 LOGIN REQUEST RECEIVED
{
  email: "vendor@company.com",
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0..."
}
```

### Step 2-4: Database Query (same as success)
```
[x8y9z0] ✅ User Found in Database
```

### Step 5: Password Validation FAILS
```
[x8y9z0] 🔑 Validating Password
```

```
[x8y9z0] ⚠️  AUTHENTICATION FAILED - Invalid Password
{
  email: "vendor@company.com",
  userId: "user-123",
  reason: "Password hash does not match",
  timestamp: "2026-01-20T10:16:30Z"
}
```

### Step 6: Service Level Failure Event
```
[x8y9z0] 🎯 AUTHENTICATION SERVICE EVENT - FAILURE
{
  eventType: "AUTH_SERVICE_FAILED",
  email: "vendor@company.com",
  failureReason: "INVALID_PASSWORD",
  failureStep: "Password validation",
  errorMessage: "Invalid email or password",
  duration: "95ms",
  tokenGenerated: false,
  timestamp: "2026-01-20T10:16:30Z"
}
```

### Step 7: Controller Level Failure Event
```
[x8y9z0] ❌ LOGIN FAILED - AUTHENTICATION_FAILED
{
  email: "vendor@company.com",
  errorMessage: "Invalid email or password",
  errorCategory: "AUTHENTICATION_FAILED",
  statusCode: 401,
  duration: "150ms",
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  timestamp: "2026-01-20T10:16:30Z"
}
```

### Step 8: HTTP Level Failure Event
```
[x8y9z0] 📊 LOGIN EVENT FAILED ❌
{
  eventType: "USER_LOGIN_FAILED",
  email: "vendor@company.com",
  errorCategory: "AUTHENTICATION_FAILED",
  errorMessage: "Invalid email or password",
  statusCode: 401,
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  responseTime: "150ms",
  tokenIssued: false,
  failureReason: "AUTHENTICATION_FAILED",
  timestamp: "2026-01-20T10:16:30Z",
  sessionCreated: false
}
```

**❌ Result: Login rejected, no token issued**

---

## ❌ FAILED LOGIN - ACCOUNT INACTIVE

### Steps 1-4: Same as success
```
[p5q6r7] ✅ User Found in Database
```

### Step 5: Account Status Check FAILS
```
[p5q6r7] ⚠️  AUTHORIZATION FAILED - Account Inactive
{
  userId: "user-456",
  email: "inactive@company.com",
  reason: "User account has been deactivated",
  timestamp: "2026-01-20T10:17:45Z"
}
```

### Step 6: Service Level Failure Event
```
[p5q6r7] 🎯 AUTHENTICATION SERVICE EVENT - FAILURE
{
  eventType: "AUTH_SERVICE_FAILED",
  email: "inactive@company.com",
  failureReason: "ACCOUNT_INACTIVE",
  failureStep: "Account status verification",
  errorMessage: "Your account is not active. Please contact the administrator.",
  duration: "78ms",
  tokenGenerated: false,
  timestamp: "2026-01-20T10:17:45Z"
}
```

### Step 7: HTTP Level Failure Event
```
[p5q6r7] 📊 LOGIN EVENT FAILED ❌
{
  eventType: "USER_LOGIN_FAILED",
  email: "inactive@company.com",
  errorCategory: "ACCOUNT_INACTIVE",
  errorMessage: "Your account is not active...",
  statusCode: 401,
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  responseTime: "120ms",
  tokenIssued: false,
  failureReason: "ACCOUNT_INACTIVE",
  timestamp: "2026-01-20T10:17:45Z",
  sessionCreated: false
}
```

**Result: Login rejected, admin notified of account status**

---

## ❌ FAILED LOGIN - VENDOR NOT APPROVED

### Steps 1-6: Same as success
```
[m1n2o3] ✅ Account Active Status Verified
```

### Step 7: Vendor Status Check FAILS
```
[m1n2o3] 🏢 Checking Vendor Approval Status
```

```
[m1n2o3] ⚠️  AUTHORIZATION FAILED - Vendor Not Approved
{
  userId: "user-789",
  vendorId: "vendor-999",
  email: "newvendor@company.com",
  vendorStatus: "PENDING",
  vendorName: "New Company Ltd",
  reason: "Vendor status is PENDING, expected ACTIVE",
  timestamp: "2026-01-20T10:18:50Z"
}
```

### Step 8: Service Level Failure Event
```
[m1n2o3] 🎯 AUTHENTICATION SERVICE EVENT - FAILURE
{
  eventType: "AUTH_SERVICE_FAILED",
  email: "newvendor@company.com",
  failureReason: "VENDOR_ISSUE",
  failureStep: "Vendor verification",
  errorMessage: "Your vendor account is pending approval or has been rejected.",
  duration: "110ms",
  tokenGenerated: false,
  timestamp: "2026-01-20T10:18:50Z"
}
```

### Step 9: HTTP Level Failure Event
```
[m1n2o3] 📊 LOGIN EVENT FAILED ❌
{
  eventType: "USER_LOGIN_FAILED",
  email: "newvendor@company.com",
  errorCategory: "VENDOR_NOT_APPROVED",
  errorMessage: "Your vendor account is pending approval...",
  statusCode: 401,
  clientIp: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  responseTime: "160ms",
  tokenIssued: false,
  failureReason: "VENDOR_NOT_APPROVED",
  timestamp: "2026-01-20T10:18:50Z",
  sessionCreated: false
}
```

**Result: Vendor login blocked until account is approved**

---

## 🔍 Key Event Indicators

### Success Event Indicators ✅
- `eventType: "USER_LOGIN_SUCCESS"` - At HTTP level
- `eventType: "AUTH_SERVICE_SUCCESS"` - At service level
- `tokenIssued: true` - Token was generated
- `sessionCreated: true` - Session was created
- `processSteps` array shows all 5-6 steps completed

### Failure Event Indicators ❌
- `eventType: "USER_LOGIN_FAILED"` - At HTTP level
- `eventType: "AUTH_SERVICE_FAILED"` or `"AUTH_SERVICE_ERROR"` - At service level
- `tokenIssued: false` - No token generated
- `sessionCreated: false` - No session created
- `failureReason` indicates why it failed
- `errorCategory` shows HTTP-level categorization

---

## Using Event Logs for Monitoring

### 1. Extract All Events for a User
```bash
grep "email: \"vendor@company.com\"" /var/log/app.log
```
Shows all login attempts for that user.

### 2. Find Failed Attempts
```bash
grep "USER_LOGIN_FAILED" /var/log/app.log
```
Shows all failed login events.

### 3. Count Failures by Reason
```bash
grep "failureReason:" /var/log/app.log | sort | uniq -c
```
Shows distribution of failure types.

### 4. Find Slow Logins
```bash
grep "responseTime:" /var/log/app.log | sort -t: -k2 -rn | head -10
```
Shows 10 slowest logins.

### 5. Track by IP Address
```bash
grep "clientIp: \"192.168.1.100\"" /var/log/app.log | grep "USER_LOGIN"
```
Shows all login attempts from a specific IP.

### 6. Security Audit
```bash
grep "AUTHENTICATION_FAILED\|ACCOUNT_INACTIVE\|VENDOR_NOT_APPROVED" /var/log/app.log
```
Shows authentication/authorization issues.

---

## Event Flow Summary

```
LOGIN REQUEST
    ↓
[Controller] 🔐 REQUEST RECEIVED
    ↓
[Controller] ✅ VALIDATION PASSED
    ↓
[Service] 🔎 DATABASE QUERY
    ↓
[Service] ✅ USER FOUND → 🔑 PASSWORD CHECK → ✅ ACCOUNT CHECK → 🏢 VENDOR CHECK
    ↓
[Service] 🎟️  TOKEN GENERATED
    ↓
┌─────────────────────────────────┐
│ SUCCESS:                        │
│ [Service] 🎯 SERVICE EVENT ✅   │
│ [Controller] 📊 EVENT CREATED   │
│ [Response] Send Token           │
│                                 │
│ FAILURE:                        │
│ [Service] 🎯 SERVICE EVENT ❌   │
│ [Controller] 📊 EVENT FAILED    │
│ [Response] Return Error         │
└─────────────────────────────────┘
    ↓
LOGGED EVENT AVAILABLE FOR AUDIT
```

---

## Event Log Files Location

The event logs are stored in your standard application log file:
- **Docker**: `/app/logs/` (if configured)
- **Local**: `./logs/` (if configured)
- **Console**: Visible in `npm start` output
- **Production**: Configure based on PM2/SystemD setup

For persistent event tracking, events should be inserted into database `auth_events` table.

