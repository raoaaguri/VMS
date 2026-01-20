# Login Flow - Detailed Logging Diagram

## Complete Login Flow with Logging Points

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                          COMPREHENSIVE LOGIN LOGGING FLOW                       ║
╚════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND - Client Side                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

  [1] USER ENTERS CREDENTIALS
      ├─ Email: admin@example.com
      ├─ Password: ••••••••
      └─ Timestamp: 2026-01-20T10:15:23Z

  [2] Login.jsx - handleSubmit()
      │
      ├─ LOG: 📝 Login Form Submitted
      │         └─ sessionId: [g7h8i9]
      │         └─ email: admin@example.com
      │         └─ timestamp: 2026-01-20T10:15:23Z
      │
      ├─ LOG: Validating form inputs
      │         └─ emailProvided: true
      │         └─ passwordProvided: true
      │         └─ emailFormat: valid ✅
      │
      └─ Calls: login(email, password)


  [3] AuthContext.jsx - login() function
      │
      ├─ LOG: 🔐 Login Attempt Started
      │         └─ requestId: [a1b2c3]
      │         └─ email: admin@example.com
      │         └─ timestamp: 2026-01-20T10:15:23Z
      │
      ├─ LOG: Sending credentials to backend
      │         └─ endpoint: /api/v1/auth/login
      │         └─ method: POST
      │
      └─ Calls: apiRequest("/api/v1/auth/login", {...})


  [4] api.js - apiRequest() function
      │
      ├─ LOG: API Configuration Loaded
      │         └─ API_BASE_URL: http://localhost:3001
      │
      ├─ LOG: [a1b2c3] API Request Started
      │         └─ method: POST
      │         └─ endpoint: /api/v1/auth/login
      │         └─ fullUrl: http://localhost:3001/api/v1/auth/login
      │         └─ hasToken: false
      │
      ├─ HTTP REQUEST SENT ──────────┐
      │  POST /api/v1/auth/login      │
      │  Content-Type: application/json
      │  {                              │
      │    email: admin@example.com,    │
      │    password: ••••••••           │
      │  }                              │
      │                                 │
      │  Network latency...             │
      │
      └─ WAITING FOR BACKEND RESPONSE
         (Logs below show what happens server-side)


┌─────────────────────────────────────────────────────────────────────────────────┐
│ BACKEND - Server Side                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘

  [5] auth.controller.js - loginHandler()
      │
      ├─ LOG: 🔐 LOGIN REQUEST RECEIVED
      │         ├─ requestId: [req-12345]  ← Same correlation across logs
      │         ├─ email: admin@example.com
      │         ├─ clientIp: 192.168.1.1
      │         ├─ method: POST
      │         └─ timestamp: 2026-01-20T10:15:23Z
      │
      ├─ LOG: ✅ Input Validation Passed
      │         ├─ emailProvided: true
      │         ├─ passwordProvided: true
      │         └─ emailFormat: valid
      │
      ├─ LOG: 🔍 Attempting User Authentication
      │         └─ email: admin@example.com
      │
      └─ Calls: authService.login(email, password)


  [6] auth.service.js - login() function
      │
      ├─ LOG: 🔎 Querying User from Database
      │         └─ email: admin@example.com
      │
      ├─ DATABASE QUERY
      │  SELECT id, name, email, password_hash, role, vendor_id, is_active
      │  FROM users
      │  WHERE email = 'admin@example.com'
      │
      ├─ LOG: ✅ User Found in Database
      │         ├─ userId: 436c4c55-...
      │         ├─ userEmail: admin@example.com
      │         ├─ userRole: ADMIN
      │         ├─ userActive: true
      │         └─ hasVendorId: false
      │
      ├─ LOG: 🔑 Validating Password
      │         └─ userId: 436c4c55-...
      │
      ├─ BCRYPT COMPARISON
      │  bcrypt.compare(plaintext, hash) → true ✅
      │
      ├─ LOG: ✅ Password Validation Successful
      │         └─ userId: 436c4c55-...
      │
      ├─ LOG: ✅ Account Active Status Verified
      │         └─ is_active: true
      │
      ├─ [SKIPPED: VENDOR CHECKS - User is ADMIN]
      │
      ├─ LOG: 🎟️ Generating JWT Token
      │         ├─ userId: 436c4c55-...
      │         ├─ role: ADMIN
      │         └─ expiresIn: 7d
      │
      ├─ JWT SIGNING
      │  jwt.sign({...}, JWT_SECRET, {expiresIn: '7d'})
      │  → eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      │
      ├─ LOG: ✅ JWT Token Generated Successfully
      │         ├─ tokenLength: 247
      │         └─ tokenExpiresIn: 7d
      │
      └─ LOG: ✅ LOGIN SERVICE COMPLETED SUCCESSFULLY
                ├─ userId: 436c4c55-...
                ├─ email: admin@example.com
                ├─ role: ADMIN
                └─ duration: 156.78ms


  [7] auth.controller.js - Response Handler
      │
      └─ LOG: ✅ LOGIN SUCCESSFUL
              ├─ userId: 436c4c55-...
              ├─ email: admin@example.com
              ├─ role: ADMIN
              └─ duration: 156.78ms
      
      HTTP RESPONSE ────────────┐
       Status: 200 OK            │
       {                         │
         user: {                 │
           id: "436c4c55-...",   │
           email: "admin@...",   │
           name: "Admin User",   │
           role: "ADMIN"         │
         },                      │
         token: "eyJhbG..."      │
       }                         │
       ← Network latency...      │
       ← Response time: ~200ms


┌─────────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND - Response Processing                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  [8] api.js - Response Handler
      │
      ├─ LOG: [a1b2c3] API Response Received
      │         ├─ status: 200
      │         └─ duration: 200.45ms
      │
      ├─ LOG: [a1b2c3] API Request Completed Successfully
      │         └─ hasData: true
      │
      └─ Returns: { user, token }


  [9] AuthContext.jsx - login() continued
      │
      ├─ LOG: [a1b2c3] ✅ Backend Login Response Received
      │         ├─ userIdReturned: true
      │         ├─ tokenReturned: true
      │         └─ userRole: ADMIN
      │
      ├─ STORE CREDENTIALS
      │  localStorage.setItem('user', JSON.stringify(user))
      │  localStorage.setItem('token', token)
      │
      ├─ LOG: [a1b2c3] 💾 User and token stored in localStorage
      │
      ├─ UPDATE REACT STATE
      │  setUser(user)
      │
      └─ LOG: [a1b2c3] ✅ Login Successful
              ├─ userId: 436c4c55-...
              ├─ email: admin@example.com
              ├─ role: ADMIN
              └─ duration: 245.67ms


  [10] Login.jsx - handleSubmit() continued
       │
       ├─ LOG: [g7h8i9] ✅ Login Successful - Redirecting User
       │         ├─ role: ADMIN
       │         ├─ userId: 436c4c55-...
       │         └─ email: admin@example.com
       │
       ├─ LOG: [g7h8i9] Redirecting to Admin Dashboard
       │
       └─ navigate('/admin/dashboard')
           ↓
           ╔═══════════════════════════════════════════════╗
           ║         USER SUCCESSFULLY LOGGED IN           ║
           ║    Redirecting to Admin Dashboard...          ║
           ╚═══════════════════════════════════════════════╝


════════════════════════════════════════════════════════════════════════════════════

ERROR SCENARIOS - LOGGING EXAMPLES

════════════════════════════════════════════════════════════════════════════════════


SCENARIO 1: BACKEND NOT RUNNING (Network Error)
───────────────────────────────────────────────────

  [4] api.js - fetch() throws error
      │
      └─ TypeError: Failed to fetch
         
      LOG: [a1b2c3] Network Error - Backend Not Reachable
          ├─ endpoint: /api/v1/auth/login
          ├─ fullUrl: http://localhost:3001/api/v1/auth/login
          ├─ errorType: NetworkError
          ├─ duration: 334.56ms
          └─ possibleCause: 'Backend server is not responding'
      
      [9] AuthContext.jsx - catch (error)
      │
      └─ LOG: [a1b2c3] ❌ Login Failed - NetworkError
              ├─ errorMessage: Unable to connect to server...
              ├─ errorCategory: NetworkError
              └─ possibleCauses: [
                   'Backend server is not running',
                   'Incorrect API URL configuration',
                   'Network connectivity issue',
                   'CORS policy blocking the request'
                 ]
      
      [10] Frontend UI - Error Display
       │
       └─ setError('Unable to connect to server...')
           ↓
           ╔═══════════════════════════════════════════════╗
           ║  ⚠️ Unable to connect to server...             ║
           ║     Please check if the backend is running.   ║
           ╚═══════════════════════════════════════════════╝


SCENARIO 2: INVALID CREDENTIALS (Auth Failed)
───────────────────────────────────────────────

  [6] auth.service.js
      │
      ├─ LOG: 🔎 Querying User from Database
      │
      ├─ LOG: ✅ User Found in Database
      │
      ├─ LOG: 🔑 Validating Password
      │
      ├─ BCRYPT COMPARISON
      │  bcrypt.compare(wrongPassword, hash) → false ❌
      │
      └─ LOG: ⚠️ AUTHENTICATION FAILED - Invalid Password
              ├─ email: admin@example.com
              ├─ userId: 436c4c55-...
              └─ reason: 'Password hash does not match'
      
      throw UnauthorizedError('Invalid email or password')
      │
      [7] Caught in controller
      │
      └─ LOG: ❌ LOGIN FAILED - AUTHENTICATION_FAILED
              ├─ statusCode: 401
              ├─ errorCategory: AUTHENTICATION_FAILED
              └─ duration: 45.23ms
      
      HTTP RESPONSE ────────────┐
       Status: 401 Unauthorized │
       {                        │
         error: {              │
           message: "Invalid   │
           email or password"  │
         }                     │
       }                       │
      
      [9] AuthContext.jsx - catch (error)
      │
      └─ LOG: ❌ Login Failed - AuthenticationError
              ├─ errorMessage: 'Invalid email or password'
              ├─ errorCategory: AuthenticationError
              └─ possibleCauses: [
                   'Email or password is incorrect',
                   'Account does not exist'
                 ]


SCENARIO 3: VENDOR NOT APPROVED (Vendor Flow)
──────────────────────────────────────────────

  [6] auth.service.js
      │
      ├─ LOG: ✅ User Found in Database
      │         ├─ userRole: VENDOR
      │         └─ vendor_id: a76007ec-...
      │
      ├─ LOG: 🏢 Checking Vendor Approval Status
      │
      ├─ DATABASE QUERY (vendors table)
      │  SELECT status FROM vendors WHERE id = 'a76007ec-...'
      │
      ├─ LOG: 📋 Vendor Record Found
      │         └─ vendorStatus: PENDING_APPROVAL
      │
      └─ LOG: ⚠️ AUTHORIZATION FAILED - Vendor Not Approved
              ├─ vendorStatus: PENDING_APPROVAL
              ├─ vendorName: Acme Corporation
              └─ reason: 'Vendor status is PENDING_APPROVAL, expected ACTIVE'
      
      throw UnauthorizedError('Your vendor account is pending approval...')
      │
      [7] Controller catches error
      │
      └─ LOG: ❌ LOGIN FAILED - VENDOR_NOT_APPROVED
              ├─ statusCode: 401
              └─ duration: 156.78ms
      
      [9] AuthContext.jsx
      │
      └─ LOG: ❌ Login Failed - VendorApprovalError
              ├─ errorMessage: '...'
              └─ possibleCauses: [
                   'Vendor account is still pending approval',
                   'Vendor account has been rejected'
                 ]


SCENARIO 4: TOKEN EXPIRED (Next login after 7 days)
────────────────────────────────────────────────────

  [Later login attempt after 7 days...]
  
  [4] api.js - authMiddleware on protected route
      │
      ├─ LOG: 🔐 TOKEN VERIFICATION STARTED
      │
      ├─ LOG: 🔍 Verifying JWT Token
      │
      ├─ JWT VERIFICATION
      │  jwt.verify(token, JWT_SECRET)
      │  → TokenExpiredError: jwt expired ❌
      │
      └─ LOG: ⚠️ TOKEN EXPIRED
              ├─ expiredAt: 2026-01-27T10:15:23Z
              └─ reason: 'Token expiration time has passed'


════════════════════════════════════════════════════════════════════════════════════

REQUEST ID CORRELATION
═════════════════════

All logs from a single login attempt share the same Request ID for tracing:

Frontend Request ID: [a1b2c3]
Backend Request ID:  [req-12345] (different but part of same flow)

Search by [a1b2c3] in browser console to see:
  1. Login attempt start
  2. API request sent
  3. Validation
  4. Authentication result
  5. Redirect (success/error)

Search by [req-12345] in backend logs to see:
  1. Request received
  2. Validation
  3. User lookup
  4. Password validation
  5. Token generation
  6. Response sent


════════════════════════════════════════════════════════════════════════════════════

TIMING BREAKDOWN
════════════════

Total Login Time: ~400ms

  Frontend:
    ├─ Form submission → AuthContext.login(): ~1ms
    ├─ Network request (frontend side): ~200ms
    │
    Backend:
    │ ├─ Request received & validation: ~5ms
    │ ├─ Database query: ~50ms
    │ ├─ Password validation (bcrypt): ~60ms
    │ ├─ Vendor check (if vendor): ~30ms
    │ ├─ Token generation (JWT sign): ~10ms
    │ └─ Total backend processing: ~156ms
    │
    ├─ Network response (backend → frontend): ~200ms
    └─ localStorage write & state update: ~3ms

Expected durations vary by:
  - Network latency (usually 50-200ms)
  - Database performance (usually 20-100ms)
  - Bcrypt iterations (usually 50-100ms)

```

---

## Key Metrics to Monitor

### Performance
- Total login time should be < 500ms
- Backend processing should be < 200ms
- Network round-trip should be < 300ms

### Security
- Failed login attempts from same IP
- Rapid successive login attempts (brute force detection)
- Invalid token attempts
- Authorization failures

### Reliability
- Database connection errors
- Backend availability
- API endpoint response times
- Error rate by category

---

## Log Filtering Tips

**View only errors:**
```javascript
// Browser console
console.table(console.memory)  // Won't work; use filter in DevTools
```

**Backend - Search by email:**
```bash
npm start 2>&1 | grep "admin@example.com"
```

**Backend - Search by request ID:**
```bash
npm start 2>&1 | grep "\[req-12345\]"
```

**Backend - Search by error type:**
```bash
npm start 2>&1 | grep "AUTHENTICATION_FAILED"
npm start 2>&1 | grep "VENDOR_NOT_APPROVED"
npm start 2>&1 | grep "DATABASE ERROR"
```

