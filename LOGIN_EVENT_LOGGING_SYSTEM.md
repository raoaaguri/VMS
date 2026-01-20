# Login Event Logging System

## Overview

The backend login system now includes comprehensive **event-based logging** that tracks all login attempts (successful and failed) with detailed audit trails. This enables monitoring, debugging, and security analysis of authentication flows.

---

## Event Types

### 1. **User Login Success Event** (Controller Level)
**Log Location:** `backend/src/modules/auth/auth.controller.js`

Triggered when user successfully authenticates and receives a token.

```
📊 LOGIN EVENT CREATED
```

**Event Data:**
- `eventType`: `USER_LOGIN_SUCCESS`
- `userId`: User ID from database
- `email`: User email address
- `role`: User role (ADMIN or VENDOR)
- `vendorId`: Vendor ID (if applicable)
- `clientIp`: Client IP address
- `userAgent`: Browser/client information
- `responseTime`: Total login processing time (ms)
- `tokenIssued`: `true`
- `sessionCreated`: `true`
- `timestamp`: ISO 8601 timestamp

**Example Log Output:**
```
[a1b2c3] 📊 LOGIN EVENT CREATED
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
  sessionCreated: true,
  timestamp: "2026-01-20T10:15:23.456Z"
}
```

---

### 2. **User Login Failed Event** (Controller Level)
**Log Location:** `backend/src/modules/auth/auth.controller.js`

Triggered when login fails at the HTTP request level.

```
📊 LOGIN EVENT FAILED
```

**Event Data:**
- `eventType`: `USER_LOGIN_FAILED`
- `email`: Email provided in login request
- `errorCategory`: Type of failure (see categories below)
- `errorMessage`: Human-readable error message
- `statusCode`: HTTP status code (400, 401, 500)
- `clientIp`: Client IP address
- `userAgent`: Browser/client information
- `responseTime`: Total processing time (ms)
- `tokenIssued`: `false`
- `failureReason`: Category of failure
- `sessionCreated`: `false`
- `timestamp`: ISO 8601 timestamp

**Failure Reason Categories:**
- `VALIDATION_ERROR` - Missing or invalid input (status 400)
- `AUTHENTICATION_FAILED` - Invalid email or password (status 401)
- `ACCOUNT_INACTIVE` - User account is deactivated (status 401)
- `VENDOR_NOT_APPROVED` - Vendor not approved or rejected (status 401)
- `BAD_REQUEST` - Malformed request (status 400)
- `UNKNOWN_ERROR` - Unexpected error (status 500)

**Example Log Output:**
```
[x8y9z0] 📊 LOGIN EVENT FAILED
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
  sessionCreated: false,
  timestamp: "2026-01-20T10:16:30.789Z"
}
```

---

### 3. **Authentication Service Success Event** (Service Level)
**Log Location:** `backend/src/modules/auth/auth.service.js`

Triggered when authentication service completes successfully.

```
🎯 AUTHENTICATION SERVICE EVENT
```

**Event Data:**
- `eventType`: `AUTH_SERVICE_SUCCESS`
- `userId`: User ID
- `email`: User email
- `role`: User role
- `vendorId`: Vendor ID (if applicable)
- `processSteps`: Array of completed authentication steps
- `tokenGenerated`: `true`
- `duration`: Service execution time (ms)
- `timestamp`: ISO 8601 timestamp

**Process Steps Include:**
1. User found in database
2. Password validation passed
3. Account active status verified
4. Vendor approval status verified (for VENDOR role)
5. Admin user verified (for ADMIN role)
6. JWT token generated

**Example Log Output:**
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
  timestamp: "2026-01-20T10:15:23.200Z"
}
```

---

### 4. **Authentication Service Failed Event** (Service Level)
**Log Location:** `backend/src/modules/auth/auth.service.js`

Triggered when authentication service fails with authorization error.

```
🎯 AUTHENTICATION SERVICE EVENT - FAILURE
```

**Event Data:**
- `eventType`: `AUTH_SERVICE_FAILED`
- `email`: User email
- `failureReason`: Type of failure (see categories below)
- `failureStep`: Which step in authentication failed
- `errorMessage`: Error description
- `duration`: Service execution time (ms)
- `tokenGenerated`: `false`
- `timestamp`: ISO 8601 timestamp

**Failure Reasons:**
- `DATABASE_ERROR` - Error querying user database
- `USER_NOT_FOUND` - Email not found in database
- `INVALID_PASSWORD` - Password hash doesn't match
- `ACCOUNT_INACTIVE` - User account is deactivated
- `VENDOR_ISSUE` - Problem with vendor record or approval
- `UNKNOWN_ERROR` - Unexpected error

**Example Log Output:**
```
[a1b2c3] 🎯 AUTHENTICATION SERVICE EVENT - FAILURE
{
  eventType: "AUTH_SERVICE_FAILED",
  email: "vendor@company.com",
  failureReason: "INVALID_PASSWORD",
  failureStep: "Password validation",
  errorMessage: "Invalid email or password",
  duration: "95ms",
  tokenGenerated: false,
  timestamp: "2026-01-20T10:17:15.450Z"
}
```

---

### 5. **Authentication Service Error Event** (Service Level)
**Log Location:** `backend/src/modules/auth/auth.service.js`

Triggered when authentication service encounters unexpected error.

```
🎯 AUTHENTICATION SERVICE EVENT - ERROR
```

**Event Data:**
- `eventType`: `AUTH_SERVICE_ERROR`
- `email`: User email
- `failureReason`: `UNEXPECTED_ERROR`
- `failureStep`: Where error occurred
- `errorMessage`: Error description
- `errorName`: Error class name
- `duration`: Service execution time (ms)
- `tokenGenerated`: `false`
- `timestamp`: ISO 8601 timestamp

**Example Log Output:**
```
[a1b2c3] 🎯 AUTHENTICATION SERVICE EVENT - ERROR
{
  eventType: "AUTH_SERVICE_ERROR",
  email: "vendor@company.com",
  failureReason: "UNEXPECTED_ERROR",
  failureStep: "Vendor verification",
  errorMessage: "Cannot read property 'status' of null",
  errorName: "TypeError",
  duration: "120ms",
  tokenGenerated: false,
  timestamp: "2026-01-20T10:18:45.600Z"
}
```

---

## Logging Architecture

### Controller Layer (`auth.controller.js`)
- Logs HTTP request/response level events
- Captures client IP and user agent
- Categorizes HTTP-level failures
- Creates `USER_LOGIN_SUCCESS` and `USER_LOGIN_FAILED` events

### Service Layer (`auth.service.js`)
- Logs business logic level events
- Tracks database queries and validation steps
- Provides detailed process step information
- Creates `AUTH_SERVICE_*` events with failure categorization

### Request Correlation
Both layers use the same request ID (e.g., `[a1b2c3]`) to correlate related logs:

```
[a1b2c3] 🔐 LOGIN REQUEST RECEIVED
  ↓
[a1b2c3] 🔎 Querying User from Database
  ↓
[a1b2c3] ✅ User Found in Database
  ↓
[a1b2c3] 🔑 Validating Password
  ↓
[a1b2c3] ✅ Password Validation Successful
  ↓
[a1b2c3] 🎯 AUTHENTICATION SERVICE EVENT (Success)
  ↓
[a1b2c3] 📊 LOGIN EVENT CREATED (Success Event)
```

---

## Usage Examples

### Monitoring Successful Logins
```bash
# Find all successful login events in logs
grep "USER_LOGIN_SUCCESS" /var/log/app.log

# Count successful logins by vendor
grep "USER_LOGIN_SUCCESS" /var/log/app.log | grep "vendorId" | wc -l
```

### Monitoring Failed Logins
```bash
# Find all failed login events
grep "USER_LOGIN_FAILED" /var/log/app.log

# Find authentication failures
grep "USER_LOGIN_FAILED" /var/log/app.log | grep "AUTHENTICATION_FAILED"

# Find account inactive failures
grep "USER_LOGIN_FAILED" /var/log/app.log | grep "ACCOUNT_INACTIVE"
```

### Tracing a Specific Login Attempt
```bash
# Using request ID (e.g., a1b2c3)
grep "\[a1b2c3\]" /var/log/app.log

# Shows entire login flow for that request
```

### Security Audit Trail
```bash
# Track login attempts from specific IP
grep "clientIp: \"192.168.1.100\"" /var/log/app.log

# Track failed attempts (brute force detection)
grep "USER_LOGIN_FAILED" /var/log/app.log | grep "192.168.1.100" | wc -l
```

### Performance Analysis
```bash
# Find slow login processes
grep "responseTime" /var/log/app.log | awk '{print $NF}' | sort -rn

# Average login time
grep "responseTime" /var/log/app.log | grep "USER_LOGIN_SUCCESS" | avg
```

---

## Log Levels

Each event is logged with appropriate level:

| Event | Level | Symbol | Color |
|-------|-------|--------|-------|
| Success login | `INFO` | ✅ | Green |
| Failed login | `ERROR` | ❌ | Red |
| Service error | `ERROR` | ❌ | Red |
| Service failure | `WARN` | ⚠️  | Yellow |
| Debug steps | `DEBUG` | 🔍 | Blue |

---

## Database Integration

For persistent event storage, create an `auth_events` table:

```sql
CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID,
  email VARCHAR(255),
  role VARCHAR(50),
  vendor_id UUID,
  status VARCHAR(20),
  error_category VARCHAR(100),
  client_ip VARCHAR(45),
  user_agent TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);
```

Then modify logger to also insert into this table for persistence.

---

## Best Practices

### For Debugging
1. Use request ID to trace entire login flow
2. Compare timestamps between layers to identify bottlenecks
3. Check `processSteps` array to see where failure occurred

### For Security
1. Monitor failed login attempts by IP (brute force detection)
2. Alert on `ACCOUNT_INACTIVE` patterns (possible account abuse)
3. Track `VENDOR_NOT_APPROVED` attempts (policy violations)

### For Operations
1. Set up alerts for spike in `USER_LOGIN_FAILED` events
2. Monitor average `responseTime` for performance regressions
3. Create dashboards showing success/failure ratios by hour

### For Analytics
1. Track successful logins by `role` (ADMIN vs VENDOR usage)
2. Analyze `failureReason` distribution (identify issues)
3. Monitor geographic distribution via `clientIp` analysis

---

## Complete Login Flow with Events

```
CLIENT REQUEST
  ↓
┌─────────────────────────────────────────────────────────┐
│ CONTROLLER LAYER (auth.controller.js)                   │
│                                                          │
│ 1. 🔐 LOGIN REQUEST RECEIVED [request-id]              │
│    - Log: email, clientIp, userAgent, method, path     │
│                                                          │
│ 2. Input Validation                                     │
│    - Check email and password present                   │
│    - Validate email format                              │
│    - 🔍 INPUT VALIDATION PASSED                        │
│                                                          │
│ 3. Call authService.login()                             │
│    ↓                                                     │
│    ┌──────────────────────────────────────┐             │
│    │ SERVICE LAYER (auth.service.js)      │             │
│    │                                      │             │
│    │ 1. 🔎 Query User from Database      │             │
│    │    - Check database error           │             │
│    │    - Check if user exists           │             │
│    │                                      │             │
│    │ 2. 🔑 Validate Password             │             │
│    │    - Compare with bcrypt hash       │             │
│    │    - Check if passwords match       │             │
│    │                                      │             │
│    │ 3. ✅ Account Active Status         │             │
│    │    - Check is_active flag           │             │
│    │    - Throw error if inactive        │             │
│    │                                      │             │
│    │ 4. 🏢 Vendor Checks (if VENDOR)    │             │
│    │    - Query vendor record            │             │
│    │    - Check vendor.status = ACTIVE   │             │
│    │                                      │             │
│    │ 5. 🎟️  Generate JWT Token           │             │
│    │    - Sign token with secret         │             │
│    │    - 7-day expiration set           │             │
│    │                                      │             │
│    │ SUCCESS:                             │             │
│    │ 🎯 AUTHENTICATION SERVICE EVENT ✅  │             │
│    │ - AUTH_SERVICE_SUCCESS              │             │
│    │ - All processSteps listed           │             │
│    │                                      │             │
│    │ FAILURE:                             │             │
│    │ 🎯 AUTHENTICATION SERVICE EVENT ❌  │             │
│    │ - AUTH_SERVICE_FAILED/ERROR         │             │
│    │ - failureReason categorized         │             │
│    └──────────────────────────────────────┘             │
│    ↑                                                     │
│ 4. Response Handling                                    │
│    - If success: Send token                            │
│    - If error: Categorize & log                        │
│                                                          │
│    SUCCESS:                                             │
│    📊 LOGIN EVENT CREATED ✅                            │
│    - USER_LOGIN_SUCCESS                                 │
│    - Token and session info                             │
│                                                          │
│    FAILURE:                                             │
│    📊 LOGIN EVENT FAILED ❌                             │
│    - USER_LOGIN_FAILED                                  │
│    - errorCategory and statusCode                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
  ↓
RESPONSE TO CLIENT
  ↓
FRONTEND (receives success or error)
```

---

## Querying Events from Logs

### All successful logins today
```sql
SELECT timestamp, user_id, email, client_ip 
FROM logs 
WHERE event_type = 'USER_LOGIN_SUCCESS' 
AND DATE(timestamp) = TODAY()
ORDER BY timestamp DESC;
```

### Failed attempts by error type
```sql
SELECT error_category, COUNT(*) as count
FROM logs 
WHERE event_type = 'USER_LOGIN_FAILED'
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY error_category
ORDER BY count DESC;
```

### Suspicious activity (multiple failures)
```sql
SELECT client_ip, email, COUNT(*) as failed_attempts
FROM logs 
WHERE event_type = 'USER_LOGIN_FAILED'
AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY client_ip, email
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

---

## Summary

The event logging system provides:

✅ **Complete audit trail** of all login attempts  
✅ **Failure categorization** for debugging and monitoring  
✅ **Performance metrics** (response times)  
✅ **Security tracking** (IP addresses, user agents)  
✅ **Request correlation** via unique request IDs  
✅ **Service-level insights** (process steps, failures)  
✅ **HTTP-level insights** (status codes, categories)  

This enables effective monitoring, debugging, and security analysis of the authentication system.
