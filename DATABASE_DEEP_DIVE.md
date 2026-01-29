# Database Deep Dive: Complete Understanding Guide

Comprehensive technical documentation for the Vendor Management System database.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Table Specifications](#table-specifications)
4. [Relationships & Data Flow](#relationships--data-flow)
5. [Business Logic & Rules](#business-logic--rules)
6. [Data Access Patterns](#data-access-patterns)
7. [Security & Authorization](#security--authorization)
8. [Performance Optimization](#performance-optimization)
9. [Integration Points](#integration-points)
10. [Audit & History Tracking](#audit--history-tracking)

---

## System Overview

### Purpose

The Vendor Management System (VMS) manages the end-to-end lifecycle of purchase orders between a company and its vendors, including:

- Vendor onboarding and approval workflow
- Purchase order creation and management
- Line item tracking with detailed product specifications
- Status tracking and updates
- Complete audit history of all changes
- Role-based access control (Admin vs Vendor)

### Technology Stack

- **Database**: PostgreSQL 14+ (compatible with Supabase and local installations)
- **Connection**: Node.js with `pg` driver
- **ORM**: Custom query builder (Supabase-compatible adapter)
- **Authentication**: JWT-based with bcrypt password hashing

### Database Characteristics

- **Total Tables**: 6 tables
- **Primary Keys**: UUID v4 (generated via `gen_random_uuid()`)
- **Timestamps**: All in UTC with timezone (`timestamptz`)
- **Date Handling**: Local dates normalized to `YYYY-MM-DD`
- **Schema Design**: Normalized relational design with proper foreign keys
- **Audit Trail**: Complete history tracking with user attribution

---

## Database Architecture

### Entity Relationship Diagram

```
┌─────────────────┐
│    vendors      │
│  (Master Data)  │
└────────┬────────┘
         │
         ├───────────────────────────┐
         │                           │
         ▼                           ▼
┌────────────────┐          ┌─────────────────────┐
│     users      │          │  purchase_orders    │
│  (Auth/Users)  │          │  (Transactions)     │
└────────────────┘          └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
         ┌──────────────────┐  ┌────────────┐  ┌──────────────────────┐
         │ purchase_order_  │  │ po_history │  │ po_line_item_history │
         │   line_items     │  │  (Audit)   │  │      (Audit)         │
         │ (Transactions)   │  └────────────┘  └──────────────────────┘
         └──────────────────┘
                    │
                    └──────► Referenced in history
```

### Schema Layers

1. **Master Data Layer**
   - `vendors`: Company/supplier information
   - `users`: Authentication and authorization

2. **Transactional Layer**
   - `purchase_orders`: PO headers
   - `purchase_order_line_items`: PO line items

3. **Audit Layer**
   - `po_history`: PO-level change tracking
   - `po_line_item_history`: Line item change tracking

---

## Table Specifications

### 1. vendors

**Purpose**: Central repository for vendor/supplier companies.

**Key Features**:
- Unique vendor codes (auto-generated on approval)
- Multi-status approval workflow
- Contact information management
- Active/inactive toggle

**Column Breakdown**:

| Column | Data Type | Constraints | Purpose & Notes |
|--------|-----------|-------------|-----------------|
| `id` | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | text | NOT NULL | Company legal name or trade name |
| `code` | text | UNIQUE, NOT NULL | System-generated code (KUS_VND_NNNNN format) |
| `contact_person` | text | NOT NULL | Primary contact full name |
| `contact_email` | text | NOT NULL | Primary email for communications |
| `contact_phone` | text | NULL | Phone number (optional, any format) |
| `address` | text | NULL | Full address with city, state, postal code |
| `gst_number` | text | NULL | GST/Tax registration number |
| `is_active` | boolean | NOT NULL, DEFAULT true | Quick toggle for vendor status |
| `status` | text | NOT NULL, DEFAULT 'ACTIVE', CHECK | Approval workflow status |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Record creation time |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last modification time |

**Status Field Values**:
- `PENDING_APPROVAL`: Initial state after vendor signup, awaiting admin review
- `ACTIVE`: Approved by admin and operational
- `REJECTED`: Admin declined vendor application

**Indexes**:
- `idx_vendors_code` ON (code) - Fast code lookups
- `idx_vendors_status` ON (status) - Filter pending approvals

**Business Rules**:
1. Vendor code is NULL until approval
2. Upon approval, code is auto-generated as next sequential number
3. Code format: `KUS_VND_00001` through `KUS_VND_99999`
4. Rejection sets is_active=false automatically
5. Cannot delete vendor if they have purchase orders (FK constraint)

---

### 2. users

**Purpose**: Authentication and authorization for both admin and vendor users.

**Key Features**:
- Role-based access (ADMIN vs VENDOR)
- Bcrypt password hashing
- Vendor association for VENDOR role
- Account activation control

**Column Breakdown**:

| Column | Data Type | Constraints | Purpose & Notes |
|--------|-----------|-------------|-----------------|
| `id` | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | text | NOT NULL | User's full name for display |
| `email` | text | UNIQUE, NOT NULL | Login credential (username) |
| `password_hash` | text | NOT NULL | Bcrypt hash (12 rounds, never exposed) |
| `role` | text | NOT NULL, CHECK | User role (ADMIN or VENDOR) |
| `vendor_id` | uuid | NULL, FK vendors(id) | Link to vendor (required for VENDOR role) |
| `is_active` | boolean | NOT NULL, DEFAULT true | Account activation status |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Account creation time |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last profile update |

**Role Values**:
- `ADMIN`: Full system access, can manage all vendors and POs
- `VENDOR`: Limited access to own vendor's POs only

**Indexes**:
- `idx_users_email` ON (email) - Fast login queries
- `idx_users_vendor_id` ON (vendor_id) - Vendor user lookups

**Business Rules**:
1. ADMIN users: vendor_id must be NULL
2. VENDOR users: vendor_id is required and must reference valid vendor
3. Email is case-sensitive and must be unique
4. Password must be hashed with bcrypt before storage
5. is_active=false prevents login (checked during authentication)
6. When vendor is approved/rejected, all linked users are activated/deactivated

**Security Notes**:
- password_hash is NEVER returned in API responses
- Only select `id, name, email, role, vendor_id, created_at, updated_at` in queries
- Password validation happens server-side only

---

### 3. purchase_orders

**Purpose**: Purchase order headers containing overall PO information.

**Key Features**:
- Unique PO numbers from ERP
- Priority levels for scheduling
- Status progression workflow
- Financial closure tracking
- Link to vendor

**Column Breakdown**:

| Column | Data Type | Constraints | Purpose & Notes |
|--------|-----------|-------------|-----------------|
| `id` | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| `po_number` | text | UNIQUE, NOT NULL | PO number from ERP (e.g., PO-2024-001) |
| `po_date` | date | NOT NULL | PO creation date in ERP |
| `priority` | text | NOT NULL, CHECK | Order urgency level |
| `type` | text | NOT NULL, CHECK | Order classification |
| `vendor_id` | uuid | NOT NULL, FK vendors(id) RESTRICT | Supplier reference |
| `status` | text | NOT NULL, DEFAULT 'CREATED', CHECK | Fulfillment status |
| `erp_reference_id` | text | NULL | External ERP system reference |
| `closure_status` | text | NOT NULL, DEFAULT 'OPEN', CHECK | Financial closure state |
| `closed_amount` | numeric | NOT NULL, DEFAULT 0, CHECK >= 0 | Amount closed in INR |
| `closed_amount_currency` | text | NOT NULL, DEFAULT 'INR' | Currency code (always INR) |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | PO creation in system |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last modification |

**Priority Values** (Order of Urgency):
- `LOW`: Standard delivery timeline
- `MEDIUM`: Normal priority
- `HIGH`: Expedited processing
- `URGENT`: Immediate attention required

**Type Values**:
- `NEW_ITEMS`: First-time purchase of products
- `REPEAT`: Re-order of previously purchased items

**Status Values** (Progressive Workflow):
1. `CREATED`: PO created, awaiting vendor acceptance
2. `ACCEPTED`: Vendor accepted with delivery commitments
3. `PLANNED`: Production/delivery scheduled
4. `DELIVERED`: All line items delivered (auto-set)

**Closure Status Values**:
- `OPEN`: Not yet financially closed
- `PARTIALLY_CLOSED`: Some payment made
- `CLOSED`: Fully paid and closed

**Indexes**:
- `idx_purchase_orders_vendor_id` ON (vendor_id) - Vendor PO queries
- `idx_purchase_orders_po_number` ON (po_number) - PO lookups

**Business Rules**:
1. PO number must be globally unique
2. vendor_id must reference active vendor
3. Cannot delete PO if referenced by line items (CASCADE handles this)
4. Status can only move forward (no regression)
5. Status automatically becomes DELIVERED when all line items are delivered
6. closure_status is independent of delivery status
7. closed_amount must be >= 0
8. Currency is always INR (hardcoded)

**FK Constraints**:
- ON DELETE RESTRICT for vendor_id (cannot delete vendor with POs)
- ON DELETE CASCADE from line items and history tables

---

### 4. purchase_order_line_items

**Purpose**: Individual product line items within purchase orders with detailed specifications.

**Key Features**:
- Multiple items per PO
- Product specifications and pricing
- Individual status tracking
- Expected delivery dates
- Extended ERP attributes

**Column Breakdown**:

**Core Fields**:

| Column | Data Type | Constraints | Purpose & Notes |
|--------|-----------|-------------|-----------------|
| `id` | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| `po_id` | uuid | NOT NULL, FK purchase_orders(id) CASCADE | Parent PO reference |
| `product_code` | text | NOT NULL | Product SKU/identifier |
| `product_name` | text | NOT NULL | Product description |
| `quantity` | numeric | NOT NULL, CHECK > 0 | Order quantity |
| `gst_percent` | numeric | NOT NULL, CHECK >= 0 | GST tax percentage |
| `price` | numeric | NOT NULL, CHECK >= 0 | Unit price before tax |
| `mrp` | numeric | NOT NULL, CHECK >= 0 | Maximum retail price |
| `line_priority` | text | NOT NULL, CHECK | Item-level priority |
| `expected_delivery_date` | date | NULL | Committed delivery date |
| `status` | text | NOT NULL, DEFAULT 'CREATED', CHECK | Line item status |
| `received_qty` | numeric | NOT NULL, DEFAULT 0 | Quantity received so far |

**Product Attribute Fields** (Optional):

| Column | Data Type | Purpose |
|--------|-----------|---------|
| `design_code` | text | Design identifier |
| `combination_code` | text | Product combination/variant code |
| `style` | text | Primary style classification |
| `sub_style` | text | Sub-category or variant |
| `region` | text | Target market/region |
| `color` | text | Primary color |
| `sub_color` | text | Secondary/accent color |
| `polish` | text | Polish type/finish |
| `size` | text | Product size |
| `weight` | numeric | Product weight (kg/g) |

**ERP Integration Fields** (Optional):

| Column | Data Type | Purpose |
|--------|-----------|---------|
| `item_code` | text | ERP-specific item code |
| `order_no` | text | ERP order number |
| `item_name` | text | ERP item description |
| `order_rate` | numeric | Rate from ERP |
| `landing_cost` | numeric | Total landed cost |
| `hsn_sac_code` | text | HSN/SAC for GST |
| `order_amount` | numeric | Total order amount |

**Timestamps**:

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

**Priority Values**:
- Same as PO priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**Status Values** (Progressive):
1. `CREATED`: Line item created
2. `ACCEPTED`: Vendor accepted with date
3. `PLANNED`: In production queue
4. `DELIVERED`: Item delivered

**Indexes**:
- `idx_purchase_order_line_items_po_id` ON (po_id) - PO line item queries

**Business Rules**:
1. Each line item belongs to exactly one PO
2. expected_delivery_date is required when status becomes ACCEPTED
3. Cannot update line items with status=DELIVERED
4. quantity must be > 0
5. All price fields must be >= 0
6. Status progression is forward-only
7. When all line items of a PO are DELIVERED, PO status auto-updates
8. Product attributes are optional and used for detailed tracking
9. ERP fields populated during import operations

**FK Constraints**:
- ON DELETE CASCADE for po_id (deleting PO removes all line items)

---

### 5. po_history

**Purpose**: Comprehensive audit trail for purchase order level changes.

**Key Features**:
- Tracks every PO field change
- Records user who made change
- Stores old and new values
- Timestamps all modifications

**Column Breakdown**:

| Column | Data Type | Constraints | Purpose & Notes |
|--------|-----------|-------------|-----------------|
| `id` | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| `po_id` | uuid | NOT NULL, FK purchase_orders(id) CASCADE | PO reference |
| `changed_by_user_id` | uuid | NULL, FK users(id) SET NULL | User who made change |
| `changed_by_role` | text | NOT NULL | Role at time of change |
| `action_type` | text | NOT NULL | Category of change |
| `field_name` | text | NOT NULL | Field that was modified |
| `old_value` | text | NULL | Previous value (as string) |
| `new_value` | text | NULL | New value (as string) |
| `changed_at` | timestamptz | NOT NULL, DEFAULT now() | Change timestamp |

**Action Type Values**:
- `STATUS_CHANGE`: PO status modified
- `PRIORITY_CHANGE`: PO priority modified
- `CLOSURE_CHANGE`: Closure status or amount changed

**Role Values**:
- `ADMIN`: Change made by admin user
- `VENDOR`: Change made by vendor user

**Indexes**:
- `idx_po_history_po_id` ON (po_id) - History by PO
- `idx_po_history_changed_at` ON (changed_at DESC) - Recent changes

**Business Rules**:
1. History record created for every PO change
2. Values stored as text for consistency
3. User reference preserved even if user is deleted (SET NULL)
4. History records are immutable (no updates or deletes)
5. Ordered by changed_at DESC for recent-first display

**FK Constraints**:
- ON DELETE CASCADE for po_id
- ON DELETE SET NULL for changed_by_user_id (preserve history)

---

### 6. po_line_item_history

**Purpose**: Detailed audit trail for line item changes.

**Key Features**:
- Tracks every line item field change
- Links to both PO and line item
- Records user attribution
- Complete change history

**Column Breakdown**:

| Column | Data Type | Constraints | Purpose & Notes |
|--------|-----------|-------------|-----------------|
| `id` | uuid | PK, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| `po_id` | uuid | NOT NULL, FK purchase_orders(id) CASCADE | Parent PO reference |
| `line_item_id` | uuid | NOT NULL, FK line_items(id) CASCADE | Specific line item |
| `changed_by_user_id` | uuid | NULL, FK users(id) SET NULL | User who made change |
| `changed_by_role` | text | NOT NULL | Role at time of change |
| `action_type` | text | NOT NULL | Category of change |
| `field_name` | text | NOT NULL | Field that was modified |
| `old_value` | text | NULL | Previous value (as string) |
| `new_value` | text | NULL | New value (as string) |
| `changed_at` | timestamptz | NOT NULL, DEFAULT now() | Change timestamp |

**Action Type Values**:
- `STATUS_CHANGE`: Line item status modified
- `PRIORITY_CHANGE`: Line item priority modified
- `EXPECTED_DATE_CHANGE`: Delivery date modified
- `DATE_CHANGE`: Generic date modification

**Role Values**:
- `ADMIN`: Change made by admin
- `VENDOR`: Change made by vendor

**Indexes**:
- `idx_po_line_item_history_po_id` ON (po_id) - History by PO
- `idx_po_line_item_history_line_item_id` ON (line_item_id) - History by item
- `idx_po_line_item_history_changed_at` ON (changed_at DESC) - Recent changes

**Business Rules**:
1. History record for every line item change
2. Both po_id and line_item_id stored for flexible querying
3. Values stored as text
4. Immutable records
5. User reference preserved if user deleted

**FK Constraints**:
- ON DELETE CASCADE for both po_id and line_item_id
- ON DELETE SET NULL for changed_by_user_id

---

## Relationships & Data Flow

### Primary Relationships

#### 1. Vendors → Users (1:Many)
```
vendors.id → users.vendor_id
Cardinality: One vendor can have multiple user accounts
Delete Behavior: ON DELETE SET NULL
```

**Data Flow**:
1. Admin creates/approves vendor
2. Vendor account created or activated
3. Users linked to vendor via vendor_id
4. Vendor users inherit permissions from vendor

**Access Pattern**:
```sql
-- Get all users for a vendor
SELECT * FROM users WHERE vendor_id = <vendor_id>;

-- Get vendor for a user
SELECT v.* FROM vendors v
JOIN users u ON u.vendor_id = v.id
WHERE u.id = <user_id>;
```

#### 2. Vendors → Purchase Orders (1:Many)
```
vendors.id → purchase_orders.vendor_id
Cardinality: One vendor can have many POs
Delete Behavior: ON DELETE RESTRICT
```

**Data Flow**:
1. PO created in ERP
2. Imported with vendor reference
3. Vendor accesses via their user account
4. All PO operations check vendor ownership

**Access Pattern**:
```sql
-- Get all POs for a vendor
SELECT * FROM purchase_orders WHERE vendor_id = <vendor_id>;

-- Get PO count per vendor
SELECT v.name, COUNT(po.id) as po_count
FROM vendors v
LEFT JOIN purchase_orders po ON po.vendor_id = v.id
GROUP BY v.id, v.name;
```

#### 3. Purchase Orders → Line Items (1:Many)
```
purchase_orders.id → purchase_order_line_items.po_id
Cardinality: One PO contains multiple line items
Delete Behavior: ON DELETE CASCADE
```

**Data Flow**:
1. PO created
2. Line items added (bulk or individual)
3. Line items updated independently
4. PO status derives from line item statuses

**Access Pattern**:
```sql
-- Get all line items for a PO
SELECT * FROM purchase_order_line_items WHERE po_id = <po_id>;

-- Get PO with line item summary
SELECT
  po.*,
  COUNT(li.id) as item_count,
  SUM(li.quantity * li.price) as total_amount
FROM purchase_orders po
LEFT JOIN purchase_order_line_items li ON li.po_id = po.id
WHERE po.id = <po_id>
GROUP BY po.id;
```

#### 4. History Tracking Relationships
```
All entities → History tables (1:Many)
Delete Behavior: ON DELETE CASCADE (history deleted with parent)
              ON DELETE SET NULL (user reference preserved)
```

**Data Flow**:
1. User updates PO or line item
2. Repository captures old and new values
3. History record created with user attribution
4. Timestamp recorded
5. History displayed in reverse chronological order

---

### Data Flow Scenarios

#### Scenario 1: Vendor Signup & Approval

```
1. Public signup form submitted
   ├─> vendors created (status='PENDING_APPROVAL', code=NULL)
   └─> users created (role='VENDOR', is_active=false)

2. Admin reviews pending vendors
   └─> Query: SELECT * FROM vendors WHERE status='PENDING_APPROVAL'

3. Admin approves vendor
   ├─> Generate vendor code (KUS_VND_NNNNN)
   ├─> Update vendor (status='ACTIVE', code=<generated>, is_active=true)
   └─> Activate all users (UPDATE users SET is_active=true WHERE vendor_id=<id>)

4. Vendor can now login
   └─> Check: role='VENDOR' AND is_active=true
```

#### Scenario 2: PO Creation & Import

```
1. Admin imports PO CSV
   ├─> Parse CSV rows
   ├─> Validate vendor_id exists
   ├─> Check po_number uniqueness
   └─> Bulk insert into purchase_orders

2. Admin imports line items CSV
   ├─> Parse CSV rows
   ├─> Validate po_id exists
   ├─> Map column names to DB fields
   └─> Bulk insert into purchase_order_line_items

3. PO appears in vendor dashboard
   └─> Query: SELECT * FROM purchase_orders WHERE vendor_id=<vendor_id>
```

#### Scenario 3: PO Acceptance by Vendor

```
1. Vendor views PO details
   └─> Query: SELECT po.*, li.* FROM purchase_orders po
              JOIN purchase_order_line_items li ON li.po_id = po.id
              WHERE po.id=<po_id> AND po.vendor_id=<vendor_id>

2. Vendor sets expected delivery dates for all line items
   └─> For each line item:
       ├─> Validate expected_delivery_date provided
       ├─> Update: UPDATE purchase_order_line_items
                   SET status='ACCEPTED', expected_delivery_date=<date>
                   WHERE id=<item_id>
       └─> Create history: INSERT INTO po_line_item_history (...)

3. PO status updated to ACCEPTED
   ├─> Update: UPDATE purchase_orders SET status='ACCEPTED' WHERE id=<po_id>
   └─> Create history: INSERT INTO po_history (...)
```

#### Scenario 4: Status Progression

```
1. Vendor updates line item to PLANNED
   ├─> Validate: current_status allows progression
   ├─> Update line item status
   └─> Create history record

2. Vendor marks line item as DELIVERED
   ├─> Update line item status
   ├─> Create history record
   └─> Check if all line items delivered:
       └─> If yes: Auto-update PO status to DELIVERED

3. Query delivered POs
   └─> SELECT * FROM purchase_orders WHERE status='DELIVERED'
```

---

## Business Logic & Rules

### Vendor Management Rules

1. **Vendor Code Generation**:
   - Format: `KUS_VND_NNNNN` (5-digit padded)
   - Auto-generated on approval
   - Sequential numbering
   - Check last code, increment by 1

2. **Vendor Approval Workflow**:
   - New signups: status='PENDING_APPROVAL'
   - Admin approves: status='ACTIVE', generate code, activate users
   - Admin rejects: status='REJECTED', deactivate users

3. **Vendor Deletion**:
   - Cannot delete if vendor has POs (FK RESTRICT)
   - Must reassign or delete POs first

### User Management Rules

1. **Role-Based Access**:
   - ADMIN: vendor_id=NULL, full access
   - VENDOR: vendor_id required, access own data only

2. **Authentication**:
   - Email + password
   - Password hashed with bcrypt (12 rounds)
   - JWT token issued on successful login
   - is_active must be true

3. **User-Vendor Linking**:
   - VENDOR users linked to exactly one vendor
   - All users of vendor activated/deactivated together

### Purchase Order Rules

1. **PO Creation**:
   - po_number must be unique
   - vendor_id must reference active vendor
   - Default status='CREATED'
   - Can have 0 or more line items initially

2. **Status Progression**:
   - Forward-only: CREATED → ACCEPTED → PLANNED → DELIVERED
   - Cannot skip statuses
   - DELIVERED set automatically when all items delivered
   - Cannot update PO if status=DELIVERED

3. **Priority Management**:
   - Can be changed at any time (except DELIVERED)
   - Independent of status
   - Tracked in history

4. **Closure Management**:
   - Independent of delivery status
   - closed_amount must be >= 0
   - Currency always INR
   - Status: OPEN → PARTIALLY_CLOSED → CLOSED

### Line Item Rules

1. **Line Item Creation**:
   - Must belong to valid PO
   - Required fields: product_code, product_name, quantity, prices, priority
   - Default status='CREATED'
   - expected_delivery_date optional initially

2. **Acceptance Requirements**:
   - expected_delivery_date MUST be provided
   - All line items must be accepted together
   - Status changes to ACCEPTED

3. **Status Progression**:
   - Forward-only: CREATED → ACCEPTED → PLANNED → DELIVERED
   - Cannot update if status=DELIVERED
   - When all items DELIVERED, PO auto-updates

4. **Validation Rules**:
   - quantity > 0
   - price >= 0
   - mrp >= 0
   - gst_percent >= 0

### History Tracking Rules

1. **When to Create History**:
   - Every field change on PO or line item
   - User-initiated changes only (not auto-updates)
   - Capture: field_name, old_value, new_value, user, role, timestamp

2. **What to Track**:
   - PO: status, priority, closure_status, closed_amount
   - Line Item: status, line_priority, expected_delivery_date

3. **History Immutability**:
   - Never update or delete history records
   - Preserve user reference even if user deleted

### Authorization Rules

1. **Admin Permissions**:
   - Full CRUD on all entities
   - Vendor approval/rejection
   - View all POs and history

2. **Vendor Permissions**:
   - View own vendor details
   - View own POs only (filter by vendor_id)
   - Update line item dates and status
   - Cannot change PO-level fields (admin only)
   - Cannot view other vendors' data

---

## Data Access Patterns

### Common Queries

#### Get Pending Vendor Approvals
```sql
SELECT v.*,
       COUNT(u.id) as user_count
FROM vendors v
LEFT JOIN users u ON u.vendor_id = v.id
WHERE v.status = 'PENDING_APPROVAL'
GROUP BY v.id
ORDER BY v.created_at ASC;
```

#### Get Vendor Dashboard (All POs)
```sql
SELECT
  po.id,
  po.po_number,
  po.po_date,
  po.priority,
  po.status,
  COUNT(li.id) as line_item_count,
  SUM(CASE WHEN li.status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_count
FROM purchase_orders po
LEFT JOIN purchase_order_line_items li ON li.po_id = po.id
WHERE po.vendor_id = $1
GROUP BY po.id
ORDER BY po.created_at DESC;
```

#### Get PO Details with Line Items
```sql
-- PO Header
SELECT
  po.*,
  jsonb_build_object(
    'id', v.id,
    'name', v.name,
    'code', v.code,
    'contact_person', v.contact_person,
    'contact_email', v.contact_email
  ) as vendor
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
WHERE po.id = $1;

-- Line Items
SELECT *
FROM purchase_order_line_items
WHERE po_id = $1
ORDER BY created_at ASC;
```

#### Get Complete History for PO
```sql
-- PO-level history
SELECT
  ph.*,
  jsonb_build_object('name', u.name, 'email', u.email) as users
FROM po_history ph
LEFT JOIN users u ON ph.changed_by_user_id = u.id
WHERE ph.po_id = $1
ORDER BY ph.changed_at DESC;

-- Line item history
SELECT
  lih.*,
  jsonb_build_object('name', u.name, 'email', u.email) as users,
  jsonb_build_object(
    'product_code', poli.product_code,
    'product_name', poli.product_name
  ) as purchase_order_line_items
FROM po_line_item_history lih
LEFT JOIN users u ON lih.changed_by_user_id = u.id
LEFT JOIN purchase_order_line_items poli ON lih.line_item_id = poli.id
WHERE lih.po_id = $1
ORDER BY lih.changed_at DESC;
```

#### Get All History (Admin View)
```sql
-- Combined history from both tables
SELECT
  'PO' as level,
  ph.po_id,
  po.po_number,
  ph.field_name,
  ph.old_value,
  ph.new_value,
  ph.changed_by_role,
  ph.changed_at,
  u.name as changed_by_name
FROM po_history ph
LEFT JOIN purchase_orders po ON ph.po_id = po.id
LEFT JOIN users u ON ph.changed_by_user_id = u.id
WHERE ($1::uuid IS NULL OR po.vendor_id = $1)

UNION ALL

SELECT
  'LINE_ITEM' as level,
  lih.po_id,
  po.po_number,
  lih.field_name,
  lih.old_value,
  lih.new_value,
  lih.changed_by_role,
  lih.changed_at,
  u.name as changed_by_name
FROM po_line_item_history lih
LEFT JOIN purchase_orders po ON lih.po_id = po.id
LEFT JOIN users u ON lih.changed_by_user_id = u.id
WHERE ($1::uuid IS NULL OR po.vendor_id = $1)

ORDER BY changed_at DESC;
```

---

## Security & Authorization

### Authentication Flow

1. User submits email + password
2. Query user by email (include password_hash)
3. Compare password with bcrypt.compare()
4. Check is_active=true
5. Generate JWT with user payload
6. Return JWT to client

### Authorization Checks

#### Middleware Pattern
```javascript
// Extract JWT from Authorization header
// Verify JWT signature and expiration
// Decode user payload (id, role, vendor_id)
// Attach to req.user

// Check role
if (req.user.role === 'ADMIN') {
  // Allow access
}

// Check vendor ownership (for VENDOR role)
if (req.user.role === 'VENDOR') {
  const po = await getPO(poId);
  if (po.vendor_id !== req.user.vendor_id) {
    // Forbidden
  }
}
```

### Data Filtering

**Admin Queries**: No filtering needed
```sql
SELECT * FROM purchase_orders;
```

**Vendor Queries**: Always filter by vendor_id
```sql
SELECT * FROM purchase_orders WHERE vendor_id = <user.vendor_id>;
```

---

## Performance Optimization

### Indexing Strategy

1. **Foreign Keys**: All FKs indexed for join performance
2. **Unique Fields**: Auto-indexed (email, code, po_number)
3. **Filter Fields**: Indexed (status, vendor_id, po_id)
4. **Sort Fields**: Indexed (changed_at for history)

### Query Optimization Tips

1. **Use Specific Columns**: Avoid `SELECT *`
2. **Pagination**: Use LIMIT and OFFSET for large result sets
3. **Joins**: Use LEFT JOIN when data may not exist
4. **Aggregations**: GROUP BY and COUNT for summaries
5. **Bulk Operations**: Batch inserts for imports (500 rows/batch)

### Connection Pooling

- Use pg Pool for connection reuse
- Max connections: 20 (default)
- Idle timeout: 30s
- Connection timeout: 2s

---

## Integration Points

### ERP System Integration

**Import POs from CSV**:
- Parse CSV with headers
- Map columns to DB fields dynamically
- Validate foreign keys (vendor_id)
- Check uniqueness (po_number)
- Bulk insert with transactions
- Handle errors gracefully

**Import Line Items from CSV**:
- Similar process to POs
- Support extended product attributes
- Map flexible column names
- Validate required fields
- Insert in batches

### External Systems

- **Authentication**: JWT-based, stateless
- **API**: REST endpoints with JSON
- **Date Format**: ISO 8601 strings
- **Currency**: INR only

---

## Audit & History Tracking

### What Gets Tracked

**PO Level**:
- status changes
- priority changes
- closure_status changes
- closed_amount changes

**Line Item Level**:
- status changes
- line_priority changes
- expected_delivery_date changes

### History Record Format

```javascript
{
  id: "uuid",
  po_id: "uuid",
  line_item_id: "uuid", // Only for line item history
  changed_by_user_id: "uuid",
  changed_by_role: "ADMIN" | "VENDOR",
  action_type: "STATUS_CHANGE" | "PRIORITY_CHANGE" | etc.,
  field_name: "status" | "priority" | etc.,
  old_value: "CREATED",
  new_value: "ACCEPTED",
  changed_at: "2026-01-29T10:30:00Z"
}
```

### Querying History

**By PO**: Filter on po_id
**By Line Item**: Filter on line_item_id
**By User**: Filter on changed_by_user_id
**By Date Range**: Filter on changed_at
**Combined View**: UNION ALL of both history tables

---

## Conclusion

This database schema provides a robust foundation for vendor and purchase order management with:

- **Data Integrity**: Foreign keys, constraints, and validations
- **Audit Trail**: Complete history tracking
- **Security**: Role-based access and authorization
- **Performance**: Proper indexing and query optimization
- **Flexibility**: Extensible product attributes and ERP integration
- **Reliability**: Transaction support and error handling

For operational guides, see:
- [DATABASE_OPERATIONS_GUIDE.md](./DATABASE_OPERATIONS_GUIDE.md)
- [DATABASE_QUICK_REFERENCE.md](./DATABASE_QUICK_REFERENCE.md)
- [DEPLOYMENT_GUIDE_UBUNTU_EC2.md](./DEPLOYMENT_GUIDE_UBUNTU_EC2.md)
