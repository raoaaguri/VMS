# Comprehensive Logging Implementation - Login Flow

## Overview

Added comprehensive logging to both frontend and backend login flows to capture all possible errors and provide detailed troubleshooting information. The logging covers:

- ✅ Client connection errors
- ✅ Backend not responding
- ✅ API URL configuration issues
- ✅ Authentication failures
- ✅ Database errors
- ✅ Authorization failures
- ✅ Token generation and verification
- ✅ All error types

---

## Frontend Logging

### 1. Logger Utility ([src/utils/logger.js](src/utils/logger.js))

A comprehensive client-side logger with colored console output and structured logging:

```javascript
const LOG_LEVELS = {
  DEBUG: 'DEBUG',    // Development only
  INFO: 'INFO',      // Important events
  WARN: 'WARN',      // Warning events
  ERROR: 'ERROR'     // Error events
};

const LOG_COLORS = {
  DEBUG: '#7C3AED',    // Violet
  INFO: '#3B82F6',     // Blue
  WARN: '#F59E0B',     // Amber
  ERROR: '#EF4444'     // Red
};
```

**Features:**
- Timestamp on every log message
- Context-aware logging (AUTH, API, etc.)
- Color-coded console output for easy reading
- Error sanitization to prevent sensitive data leaks
- Request ID tracking for correlating logs
- Development-only debug logs

**Usage:**
```javascript
import { logger } from '../utils/logger';

logger.info('User logged in', { userId: '123' });
logger.error('Login failed', error, { email: 'user@example.com' });
logger.warn('Unusual activity detected', { suspicious: true });
logger.debug('Detailed debugging info', { data: 'value' }); // Dev only
```

---

### 2. API Configuration ([src/config/api.js](src/config/api.js))

Enhanced with comprehensive request/response logging:

#### Logs Captured:
- ✅ API base URL initialization
- ✅ Each request start (method, endpoint, hasToken)
- ✅ Response received (status, duration)
- ✅ Network errors (backend not reachable)
- ✅ HTTP errors (4xx, 5xx)
- ✅ Request duration for performance monitoring
- ✅ Request IDs for correlation

#### Example Log Output:
```
[INFO] [2026-01-20T10:15:23.456Z] [AUTH] API Configuration Loaded
  { API_BASE_URL: 'http://localhost:3001', isDev: true }

[DEBUG] [2026-01-20T10:15:25.789Z] [AUTH] [a1b2c3] API Request Started
  {
    method: 'POST',
    endpoint: '/api/v1/auth/login',
    fullUrl: 'http://localhost:3001/api/v1/auth/login',
    hasToken: false
  }

[ERROR] [2026-01-20T10:15:26.123Z] [AUTH] [a1b2c3] Network Error - Backend Not Reachable
  Error: Failed to fetch
  {
    endpoint: '/api/v1/auth/login',
    fullUrl: 'http://localhost:3001/api/v1/auth/login',
    errorType: 'NetworkError',
    duration: '334.56ms',
    possibleCause: 'Backend server is not responding or not accessible from this URL'
  }
```

---

### 3. AuthContext ([src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx))

Comprehensive logging for authentication operations:

#### Session Initialization:
```
[INFO] 🔄 Initializing Auth Provider - Checking for stored session
[INFO] ✅ Session restored from localStorage
  { userId: 'f908794f-...', email: 'vendor@acme.com', role: 'VENDOR' }
```

#### Login Flow:
```
[INFO] [a1b2c3] 🔐 Login Attempt Started
  { email: 'admin@example.com', timestamp: '2026-01-20T10:15:23Z' }

[DEBUG] [a1b2c3] Sending credentials to backend
  { email: '...', passwordProvided: true, endpoint: '/api/v1/auth/login' }

[DEBUG] [a1b2c3] ✅ Backend Login Response Received
  { userIdReturned: true, tokenReturned: true, userRole: 'ADMIN' }

[DEBUG] [a1b2c3] 💾 User and token stored in localStorage

[INFO] [a1b2c3] ✅ Login Successful
  {
    userId: '436c4c55-...',
    email: 'admin@example.com',
    role: 'ADMIN',
    vendor_id: null,
    duration: '245.67ms'
  }
```

#### Error Categories:
```javascript
// Network Error
[ERROR] [a1b2c3] ❌ Login Failed - NetworkError
  {
    email: 'admin@example.com',
    errorMessage: 'Unable to connect to server',
    errorCategory: 'NetworkError',
    possibleCauses: [
      'Backend server is not running',
      'Incorrect API URL configuration',
      'Network connectivity issue',
      'CORS policy blocking the request'
    ]
  }

// Invalid Credentials
[ERROR] [a1b2c3] ❌ Login Failed - AuthenticationError
  {
    email: 'admin@example.com',
    errorMessage: 'Invalid email or password',
    errorCategory: 'AuthenticationError',
    possibleCauses: [
      'Email or password is incorrect',
      'Account does not exist'
    ]
  }

// Account Inactive
[ERROR] [a1b2c3] ❌ Login Failed - AccountStatusError
  {
    errorCategory: 'AccountStatusError',
    possibleCauses: ['Account has been deactivated by administrator']
  }

// Vendor Not Approved
[ERROR] [a1b2c3] ❌ Login Failed - VendorApprovalError
  {
    errorCategory: 'VendorApprovalError',
    possibleCauses: [
      'Vendor account is still pending approval',
      'Vendor account has been rejected'
    ]
  }

// Storage Error
[ERROR] [a1b2c3] ❌ Login Failed - StorageError
  {
    errorCategory: 'StorageError',
    possibleCauses: [
      'Browser storage is full',
      'Browser storage is disabled'
    ]
  }
```

#### Logout:
```
[INFO] [d4e5f6] 🚪 Logout Initiated
  { userId: '436c4c55-...', email: 'admin@example.com' }

[INFO] [d4e5f6] ✅ Logout Successful - Session cleared from localStorage
```

---

### 4. Login Component ([src/pages/Login.jsx](src/pages/Login.jsx))

UI-level logging for user interactions:

```
[INFO] [g7h8i9] 📝 Login Form Submitted
  {
    email: 'admin@example.com',
    timestamp: '2026-01-20T10:15:23Z',
    userAgent: 'Mozilla/5.0...'
  }

[DEBUG] [g7h8i9] Validating form inputs
  {
    emailProvided: true,
    passwordProvided: true,
    emailFormat: 'valid'
  }

[INFO] [g7h8i9] ✅ Login Successful - Redirecting User
  {
    role: 'ADMIN',
    userId: '436c4c55-...',
    email: 'admin@example.com'
  }

[DEBUG] [g7h8i9] Redirecting to Admin Dashboard

[ERROR] [g7h8i9] ❌ Login Failed - Error Occurred
  {
    email: '...',
    errorMessage: '...',
    errorType: 'Error',
    userAgent: 'Mozilla/5.0...',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

---

## Backend Logging

### 1. Auth Controller ([backend/src/modules/auth/auth.controller.js](backend/src/modules/auth/auth.controller.js))

HTTP request handler logging:

#### Request Received:
```
[INFO] [req-12345] 🔐 LOGIN REQUEST RECEIVED
  {
    email: 'admin@example.com',
    clientIp: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    timestamp: '2026-01-20T10:15:23Z',
    method: 'POST',
    path: '/api/v1/auth/login'
  }
```

#### Input Validation Errors:
```
[WARN] [req-12345] ⚠️  VALIDATION ERROR - Missing Credentials
  {
    emailProvided: true,
    passwordProvided: false,
    clientIp: '192.168.1.1'
  }

[WARN] [req-12345] ⚠️  VALIDATION ERROR - Invalid Email Format
  {
    email: 'not-an-email',
    clientIp: '192.168.1.1'
  }
```

#### Successful Login:
```
[INFO] [req-12345] ✅ LOGIN SUCCESSFUL
  {
    userId: '436c4c55-...',
    email: 'admin@example.com',
    role: 'ADMIN',
    vendor_id: null,
    duration: '156.78ms',
    clientIp: '192.168.1.1',
    timestamp: '2026-01-20T10:15:23Z'
  }
```

#### Failed Login with Error Category:
```
[ERROR] [req-12345] ❌ LOGIN FAILED - AUTHENTICATION_FAILED
  {
    email: 'admin@example.com',
    errorMessage: 'Invalid email or password',
    errorCategory: 'AUTHENTICATION_FAILED',
    statusCode: 401,
    duration: '45.23ms',
    clientIp: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

---

### 2. Auth Service ([backend/src/modules/auth/auth.service.js](backend/src/modules/auth/auth.service.js))

Core business logic logging - most detailed:

#### Database Query:
```
[DEBUG] [srv-12345] 🔎 Querying User from Database
  { email: 'admin@example.com', timestamp: '2026-01-20T10:15:23Z' }

[DEBUG] [srv-12345] ✅ User Found in Database
  {
    userId: '436c4c55-...',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN',
    userActive: true,
    hasVendorId: false
  }
```

#### User Not Found:
```
[WARN] [srv-12345] ⚠️  AUTHENTICATION FAILED - User Not Found
  {
    email: 'nonexistent@example.com',
    reason: 'No user record found with this email',
    timestamp: '2026-01-20T10:15:23Z'
  }
```

#### Database Error:
```
[ERROR] [srv-12345] ❌ DATABASE ERROR - User Query Failed
  Error: Connection timeout
  {
    email: 'admin@example.com',
    errorCode: 'ECONNREFUSED',
    errorDetails: '...',
    timestamp: '2026-01-20T10:15:23Z'
  }
```

#### Password Validation:
```
[DEBUG] [srv-12345] 🔑 Validating Password
  { userId: '436c4c55-...', email: 'admin@example.com' }

[DEBUG] [srv-12345] ✅ Password Validation Successful
  { userId: '436c4c55-...', email: 'admin@example.com' }
```

#### Invalid Password:
```
[WARN] [srv-12345] ⚠️  AUTHENTICATION FAILED - Invalid Password
  {
    email: 'admin@example.com',
    userId: '436c4c55-...',
    reason: 'Password hash does not match',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### Account Status Checks:
```
[DEBUG] [srv-12345] ✅ Account Active Status Verified
  { userId: '436c4c55-...', email: 'admin@example.com' }

[WARN] [srv-12345] ⚠️  AUTHORIZATION FAILED - Account Inactive
  {
    userId: '436c4c55-...',
    email: 'admin@example.com',
    reason: 'User account has been deactivated',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### Vendor Status Check (for VENDOR users):
```
[DEBUG] [srv-12345] 🏢 Checking Vendor Approval Status
  { userId: 'f908794f-...', vendorId: 'a76007ec-...' }

[DEBUG] [srv-12345] 📋 Vendor Record Found
  {
    vendorId: 'a76007ec-...',
    vendorStatus: 'ACTIVE',
    vendorName: 'Acme Corporation'
  }

[DEBUG] [srv-12345] ✅ Vendor Approval Status Verified - ACTIVE
  {
    userId: 'f908794f-...',
    vendorId: 'a76007ec-...',
    vendorName: 'Acme Corporation'
  }
```

#### Vendor Not Approved:
```
[WARN] [srv-12345] ⚠️  AUTHORIZATION FAILED - Vendor Not Approved
  {
    userId: 'f908794f-...',
    vendorId: 'a76007ec-...',
    email: 'vendor@acme.com',
    vendorStatus: 'PENDING_APPROVAL',
    vendorName: 'Acme Corporation',
    reason: 'Vendor status is PENDING_APPROVAL, expected ACTIVE',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### JWT Token Generation:
```
[DEBUG] [srv-12345] 🎟️  Generating JWT Token
  {
    userId: '436c4c55-...',
    email: 'admin@example.com',
    role: 'ADMIN',
    expiresIn: '7d'
  }

[DEBUG] [srv-12345] ✅ JWT Token Generated Successfully
  {
    userId: '436c4c55-...',
    tokenLength: 247,
    tokenExpiresIn: '7d'
  }
```

#### Service Completion:
```
[INFO] [srv-12345] ✅ LOGIN SERVICE COMPLETED SUCCESSFULLY
  {
    userId: '436c4c55-...',
    email: 'admin@example.com',
    role: 'ADMIN',
    vendor_id: null,
    duration: '156.78ms',
    timestamp: '2026-01-20T10:15:23Z'
  }
```

---

### 3. Auth Middleware ([backend/src/middlewares/auth.middleware.js](backend/src/middlewares/auth.middleware.js))

Token verification and authorization logging:

#### Token Verification Success:
```
[DEBUG] [mid-12345] 🔐 TOKEN VERIFICATION STARTED
  {
    path: '/api/v1/admin/dashboard/stats',
    method: 'GET',
    hasAuthHeader: true,
    clientIp: '192.168.1.1'
  }

[DEBUG] [mid-12345] 🔍 Verifying JWT Token
  { tokenLength: 247, clientIp: '192.168.1.1' }

[DEBUG] [mid-12345] ✅ TOKEN VERIFICATION SUCCESSFUL
  {
    userId: '436c4c55-...',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN',
    path: '/api/v1/admin/dashboard/stats',
    method: 'GET',
    duration: '2.34ms',
    clientIp: '192.168.1.1'
  }
```

#### Missing Token:
```
[WARN] [mid-12345] ⚠️  MISSING OR INVALID TOKEN FORMAT
  {
    path: '/api/v1/admin/dashboard/stats',
    method: 'GET',
    hasAuthHeader: false,
    authHeaderFormat: 'missing',
    clientIp: '192.168.1.1',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### Invalid Token:
```
[WARN] [mid-12345] ⚠️  INVALID TOKEN - JWT VERIFICATION FAILED
  {
    errorMessage: 'invalid signature',
    path: '/api/v1/admin/dashboard/stats',
    method: 'GET',
    duration: '1.23ms',
    clientIp: '192.168.1.1',
    reason: 'Token signature is invalid or corrupted',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### Token Expired:
```
[WARN] [mid-12345] ⚠️  TOKEN EXPIRED
  {
    expiredAt: '2026-01-27T10:15:23Z',
    path: '/api/v1/admin/dashboard/stats',
    method: 'GET',
    duration: '2.45ms',
    clientIp: '192.168.1.1',
    reason: 'Token expiration time has passed',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### Admin Access Control:
```
[DEBUG] [mid-12345] 🛡️  Checking Admin Access
  {
    userId: '436c4c55-...',
    userRole: 'ADMIN',
    path: '/api/v1/admin/dashboard/stats',
    clientIp: '192.168.1.1'
  }

[DEBUG] [mid-12345] ✅ Admin Access Verified
  {
    userId: '436c4c55-...',
    userEmail: 'admin@example.com',
    path: '/api/v1/admin/dashboard/stats',
    clientIp: '192.168.1.1'
  }
```

#### Insufficient Permissions:
```
[WARN] [mid-12345] ⚠️  ADMIN ACCESS DENIED - Insufficient Permissions
  {
    userId: 'f908794f-...',
    userEmail: 'vendor@acme.com',
    userRole: 'VENDOR',
    path: '/api/v1/admin/dashboard/stats',
    reason: 'User role "VENDOR" is not "ADMIN"',
    clientIp: '192.168.1.1',
    timestamp: '2026-01-20T10:15:24Z'
  }
```

#### Vendor Access Control:
```
[DEBUG] [mid-12345] 🛡️  Checking Vendor Access
  {
    userId: 'f908794f-...',
    userRole: 'VENDOR',
    path: '/api/v1/vendor/dashboard/stats',
    clientIp: '192.168.1.1'
  }

[DEBUG] [mid-12345] ✅ Vendor Access Verified
  {
    userId: 'f908794f-...',
    userEmail: 'vendor@acme.com',
    vendorId: 'a76007ec-...',
    path: '/api/v1/vendor/dashboard/stats',
    clientIp: '192.168.1.1'
  }
```

---

## How to View Logs

### Frontend Logs
1. Open browser Developer Tools: `F12` or `Right-click → Inspect`
2. Go to **Console** tab
3. Logs will appear with color coding:
   - 🔵 Blue = INFO
   - 🟣 Violet = DEBUG (dev only)
   - 🟡 Amber = WARN
   - 🔴 Red = ERROR

### Backend Logs
```bash
# View real-time logs
npm start

# Or with PM2 (production)
pm2 logs vms-backend

# View specific process logs
pm2 logs vms-backend --lines 100

# Search logs for specific user
pm2 logs | grep "admin@example.com"
```

---

## Log Correlation with Request IDs

Both frontend and backend use Request IDs for correlation:

```
Frontend:
[INFO] [a1b2c3] 🔐 Login Attempt Started
[DEBUG] [a1b2c3] Sending credentials to backend

Backend:
[INFO] [a1b2c3] 🔐 LOGIN REQUEST RECEIVED
[INFO] [a1b2c3] ✅ LOGIN SUCCESSFUL
```

Search by request ID to trace the entire flow across client and server.

---

## Common Scenarios & Logs

### Scenario 1: Backend Not Running

**Frontend Logs:**
```
[ERROR] [a1b2c3] Network Error - Backend Not Reachable
  errorType: 'NetworkError'
  duration: '334.56ms'
  possibleCause: 'Backend server is not responding or not accessible from this URL'

[ERROR] [a1b2c3] ❌ Login Failed - NetworkError
  possibleCauses: [
    'Backend server is not running',
    'Incorrect API URL configuration',
    'Network connectivity issue',
    'CORS policy blocking the request'
  ]
```

**Solution:** Start backend with `npm start` in backend directory

---

### Scenario 2: Wrong API URL

**Frontend Logs:**
```
[INFO] API Configuration Loaded
  API_BASE_URL: 'http://wrong-server:3001'

[ERROR] [a1b2c3] Network Error - Backend Not Reachable
  fullUrl: 'http://wrong-server:3001/api/v1/auth/login'
```

**Solution:** Check `.env` file and update `VITE_API_URL`

---

### Scenario 3: Invalid Credentials

**Frontend + Backend Logs:**
```
Frontend:
[INFO] [a1b2c3] 🔐 Login Attempt Started
  email: 'wrong@example.com'

Backend:
[WARN] [a1b2c3] ⚠️  AUTHENTICATION FAILED - User Not Found
  email: 'wrong@example.com'
  reason: 'No user record found with this email'

Frontend:
[ERROR] [a1b2c3] ❌ Login Failed - AuthenticationError
  errorMessage: 'Invalid email or password'
```

**Solution:** Check email and password are correct

---

### Scenario 4: Vendor Not Approved

**Backend Logs:**
```
[DEBUG] [srv-12345] 🏢 Checking Vendor Approval Status
[WARN] [srv-12345] ⚠️  AUTHORIZATION FAILED - Vendor Not Approved
  vendorStatus: 'PENDING_APPROVAL'
  reason: 'Vendor status is PENDING_APPROVAL, expected ACTIVE'

Frontend:
[ERROR] [a1b2c3] ❌ Login Failed - VendorApprovalError
  possibleCauses: [
    'Vendor account is still pending approval',
    'Vendor account has been rejected'
  ]
```

**Solution:** Admin needs to approve vendor in Vendors management page

---

### Scenario 5: Token Expired

**Backend Logs:**
```
[WARN] [mid-12345] ⚠️  TOKEN EXPIRED
  expiredAt: '2026-01-27T10:15:23Z'
  reason: 'Token expiration time has passed'
```

**Solution:** User needs to login again (7 day expiration)

---

## Performance Monitoring

All logs include duration metrics:

```javascript
// Frontend
duration: '245.67ms'  // Total request time

// Backend
duration: '156.78ms'  // Total service processing time
```

Use this to identify slow operations and optimization opportunities.

---

## Security Considerations

1. **Request IDs** - Enable tracing without exposing session info
2. **Error Sanitization** - Stack traces and sensitive data are cleaned before display
3. **Client IP Logging** - Backend logs client IP for security audits
4. **Timestamp Recording** - All logs include ISO timestamps for audit trails
5. **Password Masking** - Passwords are never logged (only indicators like `passwordProvided: true`)

---

## Troubleshooting Checklist

When login fails:

1. ✅ Check frontend console (F12) for detailed error messages
2. ✅ Check backend logs for service-level errors
3. ✅ Correlate frontend and backend logs using Request ID
4. ✅ Look for error category (Network/Auth/Account/Storage/etc.)
5. ✅ Check "possibleCauses" suggestions in logs
6. ✅ Verify API URL configuration
7. ✅ Ensure backend is running
8. ✅ Check credentials are correct
9. ✅ For vendors: confirm approval status in admin panel
10. ✅ Check browser console for CORS or network errors

