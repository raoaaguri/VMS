# Authorization Token Generation & Management - Deep Dive

## 📋 Table of Contents
1. [Overview](#overview)
2. [Token Generation Flow](#token-generation-flow)
3. [Architecture](#architecture)
4. [Implementation Details](#implementation-details)
5. [Token Usage](#token-usage)
6. [Environment Configuration](#environment-configuration)
7. [Production Deployment Guide](#production-deployment-guide)
8. [Security Best Practices](#security-best-practices)

---

## Overview

This project uses **JWT (JSON Web Tokens)** for authentication and authorization. The system implements:

- **Backend**: Generates JWT tokens using the `jsonwebtoken` library with a secret key
- **Frontend**: Stores tokens in browser `localStorage` and includes them in all API requests
- **Authorization**: Token-based authentication with Bearer scheme (`Authorization: Bearer <token>`)

### Key Technologies:
- **JWT Library**: `jsonwebtoken` (v9.0.2)
- **Password Hashing**: `bcryptjs` (v2.4.3)
- **Token Expiration**: 7 days (configurable)
- **Secret Key**: Environment-variable based (`JWT_SECRET`)

---

## Token Generation Flow

### Step-by-Step Process

```
User Login (Frontend)
    ↓
[Login.jsx] User enters email/password
    ↓
[api.js] apiRequest() sends POST to /api/v1/auth/login
    ↓
[Backend: auth.controller.js] loginHandler() receives request
    ↓
[auth.service.js] login() function:
    1. Query database for user by email
    2. Validate password with bcrypt.compare()
    3. Check account active status
    4. Check vendor approval status (if vendor)
    5. Generate JWT token with user info
    6. Return user object + token
    ↓
[Frontend: AuthContext.jsx] Receives response
    ↓
Store token in localStorage
Store user info in localStorage
Set user in React context
    ↓
Token automatically included in subsequent API requests
    ↓
[auth.middleware.js] Validates token on each protected route
```

---

## Architecture

### 1. Frontend Layer (src/)

#### [api.js](src/config/api.js)
**Purpose**: API client configuration and request wrapper

```javascript
// Line 39: Authorization header setup
headers.Authorization = `Bearer ${token}`;

// The token is retrieved from localStorage
const token = localStorage.getItem("token");
```

**Key Points**:
- Automatically injects the Bearer token into every API request
- Token retrieved from browser's localStorage
- Headers also include `Content-Type: application/json`

#### [AuthContext.jsx](src/contexts/AuthContext.jsx)
**Purpose**: React context for authentication state management

```javascript
// Lines 21-26: Login function
const login = async (email, password) => {
  const response = await api.auth.login({ email, password });
  
  localStorage.setItem('user', JSON.stringify(response.user));
  localStorage.setItem('token', response.token);
  
  setUser(response.user);
  return response.user;
};
```

**Key Points**:
- Manages user authentication state
- Stores both token and user information
- Token persists across browser sessions
- Provides login/logout functionality

#### [Login.jsx](src/pages/Login.jsx)
**Purpose**: Login form UI component

```javascript
// Lines 18-29: Handle login submission
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const user = await login(email, password);

    if (user.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user.role === 'VENDOR') {
      navigate('/vendor/dashboard');
    }
```

**Key Points**:
- User submits email + password
- Calls `login()` from AuthContext
- Role-based redirect after successful login

---

### 2. Backend Layer (backend/)

#### [auth.controller.js](backend/src/modules/auth/auth.controller.js)
**Purpose**: HTTP request handler for login endpoint

```javascript
export async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await authService.login(email, password);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
```

**Key Points**:
- Receives POST request to `/api/v1/auth/login`
- Validates email and password are provided
- Delegates to auth.service.js for business logic
- Returns JSON response with user and token

#### [auth.service.js](backend/src/modules/auth/auth.service.js)
**Purpose**: Core authentication logic - TOKEN GENERATION HAPPENS HERE

```javascript
// Line 43-50: JWT Token Generation
const token = jwt.sign(
  {
    id: users.id,
    email: users.email,
    role: users.role,
    vendor_id: users.vendor_id
  },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn }
);
```

**Detailed Breakdown**:

1. **Database Query** (Lines 10-14):
   ```javascript
   const { data: users, error } = await db
     .from('users')
     .select('id, name, email, password_hash, role, vendor_id, is_active')
     .eq('email', email)
     .maybeSingle();
   ```
   - Queries PostgreSQL users table by email
   - Retrieves user's password hash and metadata

2. **Password Validation** (Lines 19-24):
   ```javascript
   const isPasswordValid = await bcrypt.compare(password, users.password_hash);
   
   if (!isPasswordValid) {
     throw new UnauthorizedError('Invalid email or password');
   }
   ```
   - Uses bcrypt to compare plaintext password with stored hash
   - One-way comparison (cannot decrypt hash)
   - Passwords are NEVER stored in plaintext

3. **Account Status Checks** (Lines 26-39):
   ```javascript
   if (!users.is_active) {
     throw new UnauthorizedError('Your account is not active...');
   }
   
   // For vendors, also check approval status
   if (users.role === 'VENDOR' && users.vendor_id) {
     const { data: vendor } = await db
       .from('vendors')
       .select('status')
       .eq('id', users.vendor_id)
       .maybeSingle();
     
     if (!vendor || vendor.status !== 'ACTIVE') {
       throw new UnauthorizedError('Your vendor account is pending approval...');
     }
   }
   ```
   - Ensures user account is active
   - For vendors: confirms they're approved (not pending or rejected)

4. **JWT Token Signing** (Lines 43-50):
   ```javascript
   const token = jwt.sign(
     {                          // Payload
       id: users.id,
       email: users.email,
       role: users.role,
       vendor_id: users.vendor_id
     },
     config.jwt.secret,         // Secret key
     { expiresIn: config.jwt.expiresIn }  // Options
   );
   ```
   - Uses `jsonwebtoken` library to sign token
   - **Payload**: User information encoded in token
   - **Secret**: Retrieved from `JWT_SECRET` environment variable
   - **Expiration**: Set to 7 days (configurable in env.js)

#### [auth.middleware.js](backend/src/middlewares/auth.middleware.js)
**Purpose**: Protect routes by validating JWT tokens

```javascript
// Lines 4-24: Token validation
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);  // Remove "Bearer " prefix
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = decoded;  // Attach decoded user info to request
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}
```

**Verification Process**:
1. Extract Authorization header
2. Check it starts with "Bearer "
3. Extract token (remove "Bearer " prefix)
4. Verify token signature using same secret key
5. If valid: decode payload and attach to `req.user`
6. If expired/invalid: throw appropriate error

#### [env.js](backend/src/config/env.js)
**Purpose**: Centralized configuration management

```javascript
// Lines 40-46: JWT Configuration
jwt: {
  secret:
    process.env.JWT_SECRET ||
    validateEnv(
      "JWT_SECRET",
      "vendor-management-secret-key-change-in-production"
    ),
  expiresIn: "7d",
}
```

**Key Points**:
- Loads `JWT_SECRET` from environment variables
- Falls back to hardcoded secret in development (NOT secure!)
- Expiration time: 7 days for all tokens
- Same secret used for signing and verifying tokens

---

## Implementation Details

### JWT Token Structure

A JWT consists of 3 parts separated by dots (`.`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6IjEyMyIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4ifQ.
abcd1234efgh5678ijkl9012
```

1. **Header** (base64url encoded):
   ```json
   {
     "alg": "HS256",
     "typ": "JWT"
   }
   ```

2. **Payload** (base64url encoded):
   ```json
   {
     "id": "436c4c55-d194-4193-b01a-f784f2993170",
     "email": "admin@example.com",
     "role": "ADMIN",
     "vendor_id": null,
     "iat": 1705646400,
     "exp": 1706251200
   }
   ```

3. **Signature** (HMAC-SHA256):
   ```
   HMACSHA256(
     base64UrlEncode(header) + "." +
     base64UrlEncode(payload),
     JWT_SECRET
   )
   ```

### Password Security

```
User Password: "password123"
    ↓
bcrypt.hash(password, 10)  // 10 salt rounds
    ↓
Stored Hash: $2a$10$9O1xG2oF8v5E3c4J7k2L1uZ6bY8aX5pQ9w2xE5rT7qU3oZ1aS4hN.
    ↓
On Login: bcrypt.compare("password123", storedHash)
    ↓
Returns: true/false (no decryption - one-way comparison)
```

**Why bcrypt?**
- One-way hashing (cannot reverse)
- Salt rounds prevent rainbow table attacks
- Computationally expensive (slows down brute force)
- Industry standard for password hashing

---

## Token Usage

### In Frontend Requests

Every API request automatically includes the token:

```javascript
// From [api.js](src/config/api.js#L39)
const headers = {
  "Content-Type": "application/json",
  ...options.headers,
};

if (token) {
  headers.Authorization = `Bearer ${token}`;  // Authorization header
}
```

### Example API Call Flow

```javascript
// Frontend
const response = await api.admin.getDashboardStats();

// Internally calls:
apiRequest("/api/v1/admin/dashboard/stats")

// Sends HTTP request:
GET /api/v1/admin/dashboard/stats HTTP/1.1
Host: localhost:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

// Backend receives request:
1. authMiddleware extracts and validates token
2. If valid: req.user is populated with decoded payload
3. Route handler executes with req.user available
4. Response returned to frontend
```

### Token Validation on Protected Routes

```javascript
// Backend route configuration
router.get('/admin/dashboard/stats', 
  authMiddleware,      // First: validate token
  requireAdmin,        // Second: check if user is admin
  getDashboardStats    // Third: execute handler
);

// In requireAdmin (from [auth.middleware.js](backend/src/middlewares/auth.middleware.js#L27-L35))
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}
```

---

## Environment Configuration

### Development (.env)

```dotenv
# File: backend/.env
NODE_ENV=development
PORT=3001

# PostgreSQL Connection
PGHOST=localhost
PGPORT=5432
PGDATABASE=vms
PGUSER=postgres
PGPASSWORD=your_password

# Authentication - CHANGE THIS IN PRODUCTION!
JWT_SECRET=your_jwt_secret_here

# ERP Integration
ERP_API_KEY=your_erp_api_key_here
```

### Environment-Specific Loading

From [env.js](backend/src/config/env.js#L11-L20):

```javascript
// Determine environment
const nodeEnv = process.env.NODE_ENV || "development";

// Load environment-specific .env file
let envFile;
if (nodeEnv === "production") {
  envFile = path.join(__dirname, "../../.env.production");
} else if (nodeEnv === "staging") {
  envFile = path.join(__dirname, "../../.env.staging");
} else {
  envFile = path.join(__dirname, "../../.env");
}

dotenv.config({ path: envFile });
```

**Behavior**:
- **Development**: Loads `.env` file
- **Staging**: Loads `.env.staging` file
- **Production**: Loads `.env.production` file

---

## Production Deployment Guide

### 🔴 Critical Security Issues

Before deploying, understand these security concerns:

1. **Current JWT_SECRET is weak**: "vendor-management-secret-key-change-in-production"
2. **Fallback to hardcoded secret**: Not production-ready
3. **7-day token expiration**: Long-lived tokens increase breach impact
4. **No token refresh mechanism**: Tokens cannot be revoked
5. **localStorage storage**: Vulnerable to XSS attacks

---

### Step 1: Generate Secure JWT Secret

**Option A: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Example Output**:
```
7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
```

**Store this value securely** (use AWS Secrets Manager, environment variables, etc.)

---

### Step 2: Create .env.production File

Create `backend/.env.production` with production values:

```dotenv
# backend/.env.production

# Environment
NODE_ENV=production

# Server
PORT=3001

# PostgreSQL (use production database)
PGHOST=your-production-rds-endpoint.rds.amazonaws.com
PGPORT=5432
PGDATABASE=vms_production
PGUSER=postgres
PGPASSWORD=your_secure_production_password
PGSSLMODE=require

# Authentication - Use generated secure secret
JWT_SECRET=7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1

# ERP Integration
ERP_API_KEY=your_production_erp_api_key

# Optional: Override JWT expiration
# JWT_EXPIRES_IN=3d
```

---

### Step 3: Deploy Backend

#### 3a. SSH into Production Server
```bash
ssh -i your-key.pem ubuntu@your-production-ip
```

#### 3b. Install Production Dependencies
```bash
cd /path/to/VMS/backend
npm ci --production  # Use ci instead of install for consistent deps
```

#### 3c. Set Environment Variables
```bash
# Option 1: Copy .env.production file
scp -i your-key.pem backend/.env.production \
  ubuntu@your-production-ip:/path/to/VMS/backend/.env.production

# Option 2: Set via environment on startup
export NODE_ENV=production
export JWT_SECRET=7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
```

#### 3d. Start Backend with PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend
pm2 start "npm start" --name "vms-backend" --env .env.production

# Save PM2 config to restart on reboot
pm2 startup
pm2 save
```

---

### Step 4: Deploy Frontend

#### 4a. Build Frontend for Production
```bash
# Locally on your machine
npm run build

# This creates dist/ folder with optimized files
```

#### 4b. Configure API URL for Production
Update `src/config/api.js` for production:

```javascript
// Option 1: If using environment variables in build process
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // ... rest of logic
};

// Option 2: Build with production API URL
// Set environment variable before building:
export VITE_API_BASE_URL=https://api.yourdomain.com
npm run build
```

#### 4c. Deploy to Production Server
```bash
# Copy built frontend to server
scp -r dist/ ubuntu@your-production-ip:/var/www/vms/

# Or use: rsync -avz dist/ ubuntu@your-production-ip:/var/www/vms/
```

---

### Step 5: Configure Nginx

Create/update Nginx configuration:

```nginx
# /etc/nginx/sites-available/vms

upstream backend {
  server localhost:3001;
}

server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com www.yourdomain.com;

  # SSL certificates (from Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  # Frontend
  location / {
    root /var/www/vms;
    try_files $uri /index.html;  # SPA routing
  }

  # API proxy to backend
  location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

#### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/vms /etc/nginx/sites-enabled/vms
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

---

### Step 6: SSL/HTTPS Setup

Using Let's Encrypt (Free):

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

### Step 7: Verify Production Deployment

#### Test Login Flow
```bash
# 1. Login
curl -X POST https://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Expected response:
{
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "role": "ADMIN",
    "name": "Admin User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# 2. Use token in protected endpoint
curl -X GET https://yourdomain.com/api/v1/admin/dashboard/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Should return dashboard stats (not 401/403)
```

#### Check Logs
```bash
# Backend logs
pm2 logs vms-backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Security Best Practices

### 1. JWT Secret Management

```
❌ DON'T:
- Commit JWT_SECRET to Git
- Use weak secrets
- Share secrets via email/chat
- Use same secret across environments

✅ DO:
- Generate using cryptographically secure methods
- Store in environment variables
- Use AWS Secrets Manager or similar
- Different secret per environment
- Rotate secrets periodically
```

### 2. Token Expiration & Refresh

**Current Implementation**: 7-day expiration (in [env.js](backend/src/config/env.js))

**Recommendation**: Implement token refresh

```javascript
// Pseudo-code for refresh token implementation
router.post('/auth/refresh', (req, res) => {
  const refreshToken = req.body.refreshToken;
  
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    // Generate new access token
    const newAccessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '15m'  // Shorter expiration
    });
    
    res.json({ token: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

### 3. Token Storage Security

**Current**: Stored in browser `localStorage`

**Risks**:
- ❌ Vulnerable to XSS (Cross-Site Scripting) attacks
- ❌ Any JavaScript can access it

**Improvements**:
```javascript
// Better: Use httpOnly cookies (backend sets)
res.cookie('token', token, {
  httpOnly: true,      // JS cannot access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Frontend: Cookies sent automatically with requests
// No manual Authorization header needed
```

### 4. HTTPS/TLS

```
❌ Never send tokens over HTTP
✅ Always use HTTPS in production
✅ Use strong SSL/TLS configuration
✅ Enable HSTS header
```

### 5. Token Validation

```javascript
// Current: Basic validation in [auth.middleware.js](backend/src/middlewares/auth.middleware.js)

// Enhance with:
export function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);
    
    // ✅ Verify signature
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // ✅ Check expiration (jwt.verify already does this)
    // ✅ Validate claims
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid token claims');
    }
    
    // ✅ Optional: Check against blacklist (for token revocation)
    if (isTokenBlacklisted(token)) {
      throw new Error('Token has been revoked');
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    // Handle error appropriately
  }
}
```

### 6. Role-Based Access Control (RBAC)

Already implemented in [auth.middleware.js](backend/src/middlewares/auth.middleware.js#L27):

```javascript
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
}

export function requireVendor(req, res, next) {
  if (req.user.role !== 'VENDOR') {
    return next(new ForbiddenError('Vendor access required'));
  }
  next();
}
```

### 7. Rate Limiting on Auth Endpoints

```javascript
// Install: npm install express-rate-limit

import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per IP
  message: 'Too many login attempts, try again later'
});

router.post('/login', loginLimiter, loginHandler);
```

### 8. Audit Logging

```javascript
// Log authentication events for security audit
function logAuthEvent(event, user, success) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    event,  // 'login', 'logout', 'token_verification_failed'
    user: user?.email,
    userId: user?.id,
    success,
    userAgent: req.get('user-agent'),
    ip: req.ip
  }));
}
```

---

## Troubleshooting

### Common Issues

#### Issue: "Token expired"
```
Cause: Token's exp claim is before current time
Solution: Tokens are valid for 7 days from generation
          Generate new token by logging in again
```

#### Issue: "Invalid token"
```
Cause: Token signature doesn't match JWT_SECRET
Solution: 
  - Verify JWT_SECRET is same on all servers
  - Check token wasn't corrupted in transit
  - Re-login to get new valid token
```

#### Issue: "No token provided"
```
Cause: Missing Authorization header
Solution: Ensure frontend is setting header:
          Authorization: Bearer <token>
```

#### Issue: Token works locally but not in production
```
Cause: Different JWT_SECRET between environments
Solution: 
  - Check production .env.production file exists
  - Verify NODE_ENV=production is set
  - Restart backend after changing secrets
```

---

## Summary Table

| Component | File | Responsibility |
|-----------|------|-----------------|
| **Frontend Form** | [src/pages/Login.jsx](src/pages/Login.jsx) | User input |
| **Frontend Request** | [src/config/api.js](src/config/api.js#L39) | Add Authorization header |
| **Frontend Storage** | [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) | Store token in localStorage |
| **Backend Handler** | [backend/src/modules/auth/auth.controller.js](backend/src/modules/auth/auth.controller.js) | HTTP endpoint |
| **Business Logic** | [backend/src/modules/auth/auth.service.js](backend/src/modules/auth/auth.service.js) | Password validation + JWT signing |
| **Token Verification** | [backend/src/middlewares/auth.middleware.js](backend/src/middlewares/auth.middleware.js) | Validate token on protected routes |
| **Configuration** | [backend/src/config/env.js](backend/src/config/env.js) | Load JWT_SECRET and settings |

---

## Production Checklist

- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Create `.env.production` file with production values
- [ ] Set `NODE_ENV=production`
- [ ] Configure production PostgreSQL database
- [ ] Set production API URLs in frontend config
- [ ] Enable HTTPS/TLS with valid certificate
- [ ] Configure Nginx reverse proxy
- [ ] Set up PM2 process management
- [ ] Test login flow end-to-end
- [ ] Configure monitoring and logging
- [ ] Set up automated backups
- [ ] Enable rate limiting on auth endpoints
- [ ] Review security headers
- [ ] Document JWT_SECRET rotation procedures
- [ ] Test token expiration and refresh (if implemented)

