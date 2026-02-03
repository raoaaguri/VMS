# Session Management Implementation

## Overview
This document outlines the session management system implemented for the Vendor Management System (VMS) with role-based session timeouts and automatic redirect to login.

## Features Implemented

### 1. Role-Based Session Timeouts
- **Admin Users**: 12 hours session timeout
- **Vendor Users**: 24 hours session timeout
- Configured in `backend/src/config/env.js`

### 2. Backend Changes

#### JWT Configuration (`backend/src/config/env.js`)
```javascript
jwt: {
  secret: process.env.JWT_SECRET || "vendor-management-secret-key",
  expiresIn: "7d", // Default fallback
  sessionTimeouts: {
    ADMIN: "12h", // 12 hours for admin
    VENDOR: "24h", // 24 hours for vendor
  },
}
```

#### Auth Service (`backend/src/modules/auth/auth.service.js`)
- Updated JWT token generation to use role-based expiration
- Logs session timeout information for debugging

#### Auth Middleware (`backend/src/middlewares/auth.middleware.js`)
- Already handles token verification and expiration
- Returns 401 status for expired/invalid tokens

### 3. Frontend Changes

#### Auth Context (`src/contexts/AuthContext.jsx`)
- **Token Validation**: Checks JWT expiration on app initialization
- **Automatic Logout**: Clears expired sessions automatically
- **Periodic Checks**: Validates session every 5 minutes during active use
- **Redirect Handling**: Automatically redirects to login on session expiration

#### API Configuration (`src/config/api.js`)
- **401 Error Handling**: Detects unauthorized responses
- **Automatic Logout**: Clears session and redirects on 401 errors
- **Session Expiration Messages**: Provides user-friendly error messages

#### Route Protection (`src/App.jsx`)
- **Protected Routes**: All admin and vendor routes are protected
- **Catch-all Routes**: Unmatched routes redirect to login
- **Role-based Access**: Users can only access routes appropriate to their role

### 4. User Interface Components

#### Session Status (`src/components/SessionStatus.jsx`)
- **Real-time Display**: Shows remaining session time
- **User Information**: Displays current user details
- **Session Timeout Info**: Shows role-specific timeout duration
- **Quick Logout**: Provides logout functionality

#### Session Warning (`src/components/SessionWarning.jsx`)
- **30-minute Warning**: Alerts users when session is about to expire
- **Action Options**: Allows extending session or dismissing warning
- **Automatic Dismissal**: Hides when session expires

#### Layout Integration (`src/components/Layout.jsx`)
- **Header Integration**: Session status displayed in navigation
- **Warning Overlay**: Session warnings appear as floating notifications

## Security Features

### 1. Token Validation
- JWT tokens are validated on every API request
- Client-side validation prevents expired token usage
- Server-side validation ensures token integrity

### 2. Automatic Session Cleanup
- Expired sessions are automatically cleared
- Local storage is sanitized on logout/expiration
- Users are redirected to login page

### 3. Route Protection
- All protected routes require valid authentication
- Direct URL access without authentication redirects to login
- Role-based access control prevents unauthorized access

## User Experience

### 1. Seamless Session Management
- Users remain logged in for their designated session duration
- Automatic logout prevents unauthorized access
- Clear session status information

### 2. Proactive Warnings
- 30-minute warning before session expiration
- Options to extend session or save work
- User-friendly error messages

### 3. Smooth Transitions
- Automatic redirect to login on session expiration
- Preservation of application state during session checks
- Minimal disruption to user workflow

## Technical Implementation Details

### JWT Token Structure
```javascript
{
  "id": "user_id",
  "email": "user@example.com", 
  "role": "ADMIN|VENDOR",
  "vendor_id": "vendor_id_if_applicable",
  "iat": "issued_at_timestamp",
  "exp": "expiration_timestamp"
}
```

### Session Check Intervals
- **App Initialization**: Immediate validation
- **Active Use**: Every 5 minutes
- **Warning System**: Every minute (when < 30 minutes remaining)

### Error Handling
- **Network Errors**: Graceful fallback with user notifications
- **Token Errors**: Automatic cleanup and redirect
- **Storage Errors**: Fallback to memory state

## Configuration

### Environment Variables
```bash
JWT_SECRET=your-secret-key
VITE_API_BASE_URL=http://localhost:3001
```

### Session Timeout Customization
Modify `backend/src/config/env.js`:
```javascript
sessionTimeouts: {
  ADMIN: "12h",  // Change as needed
  VENDOR: "24h", // Change as needed
}
```

## Testing

### Test Scenarios
1. **Normal Session**: Verify users stay logged in for expected duration
2. **Session Expiration**: Confirm automatic logout and redirect
3. **Direct URL Access**: Test protection of routes without authentication
4. **Role-based Access**: Verify users can only access appropriate routes
5. **Session Warnings**: Test 30-minute warning functionality
6. **API Errors**: Verify 401 error handling and automatic logout

### Manual Testing Steps
1. Login as admin user
2. Check session status display shows 12-hour timeout
3. Wait for 30-minute warning (or modify token for testing)
4. Verify warning appears and functions correctly
5. Test direct URL access without authentication
6. Verify automatic redirect to login page

## Monitoring and Logging

### Backend Logging
- Login attempts and successes
- Token generation and expiration
- Authentication failures and errors

### Frontend Logging
- Session validation events
- Automatic logout triggers
- API error responses

### Security Events
- Failed authentication attempts
- Token expiration events
- Unauthorized access attempts

This comprehensive session management system ensures secure, user-friendly authentication with appropriate session timeouts for different user roles.
