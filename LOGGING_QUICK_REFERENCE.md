# Logging Quick Reference

## 🚀 Quick Start

### View Frontend Logs
1. Open browser DevTools: **F12**
2. Go to **Console** tab
3. Look for colored messages:
   - 🔵 Blue = INFO
   - 🟣 Violet = DEBUG
   - 🟡 Amber = WARN  
   - 🔴 Red = ERROR

### View Backend Logs
```bash
# Start backend and see logs
cd backend
npm start

# With PM2 (production)
pm2 logs vms-backend
```

---

## 📋 Log Levels

| Level | Frontend | Backend | Use Case |
|-------|----------|---------|----------|
| **DEBUG** | 🟣 Colored | `[DEBUG]` | Detailed info (dev only) |
| **INFO** | 🔵 Colored | `[INFO]` | Important events |
| **WARN** | 🟡 Colored | `[WARN]` | Warning events |
| **ERROR** | 🔴 Colored | `[ERROR]` | Error events |

---

## 🔍 Common Error Categories

### Network Error
**Cause:** Backend not reachable
```
Frontend:
[ERROR] ❌ Login Failed - NetworkError
  possibleCauses: [
    'Backend server is not running',
    'Incorrect API URL configuration'
  ]
```
**Fix:** Start backend with `npm start`

### Authentication Failed
**Cause:** Wrong email/password
```
Backend:
[WARN] ⚠️ AUTHENTICATION FAILED - Invalid Password
  reason: 'Password hash does not match'
```
**Fix:** Check credentials

### Account Inactive
**Cause:** Account deactivated
```
Backend:
[WARN] ⚠️ AUTHORIZATION FAILED - Account Inactive
  reason: 'User account has been deactivated'
```
**Fix:** Contact admin to reactivate

### Vendor Not Approved
**Cause:** Vendor pending approval
```
Backend:
[WARN] ⚠️ AUTHORIZATION FAILED - Vendor Not Approved
  vendorStatus: 'PENDING_APPROVAL'
```
**Fix:** Wait for admin approval

### Token Expired
**Cause:** Token older than 7 days
```
Backend:
[WARN] ⚠️ TOKEN EXPIRED
  reason: 'Token expiration time has passed'
```
**Fix:** Login again

### Token Invalid
**Cause:** Token corrupted or forged
```
Backend:
[WARN] ⚠️ INVALID TOKEN - JWT VERIFICATION FAILED
  reason: 'Token signature is invalid or corrupted'
```
**Fix:** Clear cache, login again

---

## 🔗 Request ID Correlation

Every login attempt has a unique ID for tracing:

```
[a1b2c3] 🔐 Login Attempt Started
[a1b2c3] Sending credentials to backend
[a1b2c3] API Response Received
[a1b2c3] ✅ Login Successful
```

Search by `[a1b2c3]` to see complete flow.

---

## ⏱️ Performance Metrics

Check duration for optimization:

```
// Normal
duration: '245.67ms'  ✅ Good

// Slow
duration: '5000ms'    ⚠️ Database/Network issue

// Backend processing
Backend took: 156ms
Network took: 200ms
```

---

## 🛡️ Security Checks

Watch for:
- ❌ Multiple failed login attempts (brute force)
- ❌ Invalid tokens from unknown IPs
- ❌ Authorization failures
- ✅ All requests include clientIp for audit trail

---

## 📝 Log Files Location

| Component | Location |
|-----------|----------|
| Frontend Console | DevTools Console tab |
| Backend Console | Terminal where `npm start` runs |
| Backend (PM2) | `pm2 logs vms-backend` |

---

## 🔧 Common Issues & Fixes

| Issue | Log Output | Fix |
|-------|-----------|-----|
| Backend down | Network Error | `cd backend && npm start` |
| Wrong API URL | TypeError: Failed to fetch | Update `.env` VITE_API_URL |
| Wrong password | Invalid email or password | Check credentials |
| User doesn't exist | User Not Found | Check email exists |
| Vendor not approved | Vendor Not Approved | Admin must approve |
| Token expired | Token expired | Login again |
| Storage full | Storage Error | Clear browser cache |

---

## 💡 Tips

- 🔍 Search logs by Request ID `[a1b2c3]` for complete trace
- 📊 Look for duration metrics to find bottlenecks
- 🚨 Red error logs indicate actual failures
- 🟡 Yellow warnings indicate authorization issues
- 💾 Frontend logs show user-side errors
- 🖥️ Backend logs show server-side errors
- 🔐 Both logged together = full picture

---

## 📞 Debugging Workflow

1. **User reports login failure**
2. **Check frontend console** (F12)
   - See error category (Network/Auth/Account/Storage/etc.)
   - See possible causes
3. **Check backend logs**
   - Search by email or Request ID
   - See where failure occurred
4. **Correlate logs**
   - Frontend logs → Backend logs (by timestamp/ID)
   - Identify root cause
5. **Apply fix**
   - Network issue: Start backend
   - Auth issue: Check credentials
   - Account issue: Check status in database
   - Token issue: Re-login

