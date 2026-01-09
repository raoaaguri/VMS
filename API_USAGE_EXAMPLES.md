# API Usage Examples

This document provides example API requests for all the new features.

---

## 1. Vendor Signup

### Register New Vendor (Public - No Auth Required)

```bash
curl -X POST http://localhost:3001/public/vendor-signup \
  -H "Content-Type: application/json" \
  -d '{
    "vendorName": "Tech Solutions Inc",
    "contactPerson": "Jane Smith",
    "contactEmail": "jane@techsolutions.com",
    "contactPhone": "+1-555-0199",
    "address": "123 Tech Street, Silicon Valley, CA",
    "gstNumber": "29AABCT9999L1ZV",
    "password": "securepass123",
    "confirmPassword": "securepass123"
  }'
```

**Response:**
```json
{
  "message": "Vendor signup successful. Your account is pending approval from the admin.",
  "success": true
}
```

---

## 2. Admin Vendor Management

### List All Vendors (with status filter)

```bash
curl -X GET "http://localhost:3001/admin/vendors?status=PENDING_APPROVAL" \
  -H "Authorization: Bearer <admin_token>"
```

### Approve Vendor

```bash
curl -X POST http://localhost:3001/admin/vendors/<vendor_id>/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "id": "...",
  "name": "Tech Solutions Inc",
  "code": "KUS_VND_00008",
  "status": "ACTIVE",
  "is_active": true,
  ...
}
```

### Reject Vendor

```bash
curl -X POST http://localhost:3001/admin/vendors/<vendor_id>/reject \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

## 3. Global Line Items

### Admin: Get All Line Items

```bash
# Get all line items
curl -X GET http://localhost:3001/admin/line-items \
  -H "Authorization: Bearer <admin_token>"

# Filter by status
curl -X GET "http://localhost:3001/admin/line-items?status=DELIVERED" \
  -H "Authorization: Bearer <admin_token>"

# Filter by priority
curl -X GET "http://localhost:3001/admin/line-items?priority=URGENT" \
  -H "Authorization: Bearer <admin_token>"

# Get delayed items
curl -X GET "http://localhost:3001/admin/line-items?status=DELAYED" \
  -H "Authorization: Bearer <admin_token>"

# Multiple filters with pagination
curl -X GET "http://localhost:3001/admin/line-items?status=CREATED&priority=HIGH&page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "po_id": "...",
      "po_number": "PO-2026-101",
      "vendor_name": "TechPro Solutions",
      "product_code": "PROD-A001",
      "product_name": "Widget Type A",
      "quantity": 45,
      "line_priority": "HIGH",
      "expected_delivery_date": "2026-01-15",
      "status": "CREATED",
      "is_delayed": false
    },
    ...
  ],
  "page": 1,
  "limit": 20,
  "total": 15
}
```

### Vendor: Get Their Line Items

```bash
curl -X GET "http://localhost:3001/vendor/line-items?status=ALL&priority=ALL" \
  -H "Authorization: Bearer <vendor_token>"
```

---

## 4. PO Closure Management

### Update PO Closure (Admin Only)

```bash
curl -X PUT http://localhost:3001/admin/pos/<po_id>/closure \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "closure_status": "PARTIALLY_CLOSED",
    "closed_amount": 15000.50
  }'
```

**Response:**
```json
{
  "id": "...",
  "po_number": "PO-2026-101",
  "closure_status": "PARTIALLY_CLOSED",
  "closed_amount": 15000.50,
  "closed_amount_currency": "INR",
  ...
}
```

**Valid closure_status values:**
- `"OPEN"` - PO is still open
- `"PARTIALLY_CLOSED"` - PO is partially closed
- `"CLOSED"` - PO is fully closed

---

## 5. PO History

### Get PO History (Admin)

```bash
curl -X GET http://localhost:3001/admin/pos/<po_id>/history \
  -H "Authorization: Bearer <admin_token>"
```

### Get PO History (Vendor)

```bash
curl -X GET http://localhost:3001/vendor/pos/<po_id>/history \
  -H "Authorization: Bearer <vendor_token>"
```

**Response:**
```json
[
  {
    "id": "...",
    "po_id": "...",
    "changed_by_user_id": "...",
    "changed_by_role": "ADMIN",
    "action_type": "CLOSURE_CHANGE",
    "field_name": "closure_status",
    "old_value": "OPEN",
    "new_value": "PARTIALLY_CLOSED",
    "changed_at": "2026-01-09T10:30:00Z",
    "level": "PO",
    "line_item_reference": null,
    "users": {
      "name": "Admin User",
      "email": "admin@example.com"
    }
  },
  {
    "id": "...",
    "po_id": "...",
    "line_item_id": "...",
    "changed_by_user_id": "...",
    "changed_by_role": "VENDOR",
    "action_type": "STATUS_CHANGE",
    "field_name": "status",
    "old_value": "ACCEPTED",
    "new_value": "PLANNED",
    "changed_at": "2026-01-09T09:15:00Z",
    "level": "LINE_ITEM",
    "line_item_reference": "PROD-A001 - Widget Type A",
    "users": {
      "name": "Vendor User",
      "email": "vendor@acme.com"
    }
  }
]
```

---

## 6. Dashboard Statistics

### Admin Dashboard Stats

```bash
curl -X GET http://localhost:3001/admin/dashboard/stats \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "delayed_po_count": 3,
  "delivering_today_po_count": 2,
  "delayed_line_item_count": 8,
  "delivering_today_line_item_count": 5,
  "delivered_po_counts": {
    "this_week": 12,
    "this_month": 45,
    "this_year": 120
  },
  "delivered_line_item_counts": {
    "this_week": 35,
    "this_month": 150,
    "this_year": 450
  },
  "average_delay_days": 0,
  "on_time_delivery_rate": 100,
  "open_pos_by_priority": {
    "LOW": 5,
    "MEDIUM": 8,
    "HIGH": 12,
    "URGENT": 3
  }
}
```

### Vendor Dashboard Stats

```bash
curl -X GET http://localhost:3001/vendor/dashboard/stats \
  -H "Authorization: Bearer <vendor_token>"
```

**Response:**
```json
{
  "on_time_line_item_count_this_month": 25,
  "delayed_line_item_count_this_month": 3,
  "open_pos_by_priority": {
    "LOW": 2,
    "MEDIUM": 4,
    "HIGH": 6,
    "URGENT": 1
  }
}
```

---

## 7. Authentication with New Validation

### Login (with vendor status check)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@acme.com",
    "password": "vendor123"
  }'
```

**Success Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "Vendor User",
    "email": "vendor@acme.com",
    "role": "VENDOR",
    "vendor_id": "..."
  }
}
```

**Error Responses:**

If user is inactive:
```json
{
  "error": {
    "message": "Your account is not active. Please contact the administrator.",
    "statusCode": 401
  }
}
```

If vendor is pending approval:
```json
{
  "error": {
    "message": "Your vendor account is pending approval or has been rejected.",
    "statusCode": 401
  }
}
```

---

## 8. Query Parameter Reference

### Line Items Endpoints

**Status Filter Options:**
- `CREATED` - Show only created items
- `ACCEPTED` - Show only accepted items
- `PLANNED` - Show only planned items
- `DELIVERED` - Show only delivered items
- `DELAYED` - Show only delayed items (status != DELIVERED AND today > expected_delivery_date)
- `ALL` - Show all items (default)

**Priority Filter Options:**
- `LOW` - Low priority items
- `MEDIUM` - Medium priority items
- `HIGH` - High priority items
- `URGENT` - Urgent priority items
- `ALL` - All priorities (default)

**Pagination:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Example:**
```
GET /admin/line-items?status=DELAYED&priority=URGENT&page=1&limit=25
```

---

## 9. Frontend Integration Examples

### Vendor Signup

```javascript
const signupVendor = async (formData) => {
  const response = await fetch('http://localhost:3001/public/vendor-signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
};
```

### Approve Vendor

```javascript
const approveVendor = async (vendorId, token) => {
  const response = await fetch(`http://localhost:3001/admin/vendors/${vendorId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  return await response.json();
};
```

### Get Line Items with Filters

```javascript
const getLineItems = async (filters, token, role = 'admin') => {
  const params = new URLSearchParams(filters);
  const endpoint = role === 'admin' ? 'admin' : 'vendor';

  const response = await fetch(
    `http://localhost:3001/${endpoint}/line-items?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );

  return await response.json();
};

// Usage
const delayedItems = await getLineItems({
  status: 'DELAYED',
  priority: 'ALL'
}, token, 'admin');
```

### Update PO Closure

```javascript
const updatePoClosure = async (poId, closureData, token) => {
  const response = await fetch(`http://localhost:3001/admin/pos/${poId}/closure`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(closureData)
  });

  return await response.json();
};

// Usage
await updatePoClosure(poId, {
  closure_status: 'PARTIALLY_CLOSED',
  closed_amount: 15000.50
}, token);
```

### Get Dashboard Stats

```javascript
const getDashboardStats = async (token, role = 'admin') => {
  const endpoint = role === 'admin' ? 'admin' : 'vendor';

  const response = await fetch(
    `http://localhost:3001/${endpoint}/dashboard/stats`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );

  return await response.json();
};
```

### Get PO History

```javascript
const getPoHistory = async (poId, token, role = 'admin') => {
  const endpoint = role === 'admin' ? 'admin' : 'vendor';

  const response = await fetch(
    `http://localhost:3001/${endpoint}/pos/${poId}/history`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );

  return await response.json();
};
```

---

## 10. Testing Workflow

### Complete Vendor Approval Flow

1. **Vendor Signs Up:**
   ```bash
   curl -X POST http://localhost:3001/public/vendor-signup \
     -H "Content-Type: application/json" \
     -d '{
       "vendorName": "New Company",
       "contactPerson": "John Doe",
       "contactEmail": "john@newcompany.com",
       "contactPhone": "+1-555-0100",
       "address": "123 Main St",
       "gstNumber": "29AABCT1111L1ZV",
       "password": "password123",
       "confirmPassword": "password123"
     }'
   ```

2. **Admin Logs In:**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'
   ```

3. **Admin Views Pending Vendors:**
   ```bash
   curl -X GET "http://localhost:3001/admin/vendors?status=PENDING_APPROVAL" \
     -H "Authorization: Bearer <admin_token>"
   ```

4. **Admin Approves Vendor:**
   ```bash
   curl -X POST http://localhost:3001/admin/vendors/<vendor_id>/approve \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json"
   ```

   Vendor now has:
   - `status = 'ACTIVE'`
   - `code = 'KUS_VND_00008'` (auto-generated)
   - `is_active = true`
   - User's `is_active = true`

5. **Vendor Can Now Log In:**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"john@newcompany.com","password":"password123"}'
   ```

---

## Notes

- Replace `<admin_token>`, `<vendor_token>`, `<vendor_id>`, `<po_id>` with actual values
- All authenticated endpoints require a valid JWT token in the Authorization header
- The backend server runs on `http://localhost:3001` by default
- Date formats should be in ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`
