# 📚 Database Documentation Index

## Complete Database Guide - All Resources

---

## 📖 Documentation Files

### 1. **DATABASE_SCHEMA_REFERENCE.md** - Complete Schema
**Size:** ~17 KB  
**Purpose:** Full technical schema reference

**Contains:**
- Complete table definitions with SQL
- All 6 tables documented (vendors, users, purchase_orders, purchase_order_line_items, po_history, po_line_item_history)
- Column descriptions
- Constraints and indexes
- Relationships and ER diagram
- Current record counts
- Connection details

**Use When:** You need complete schema understanding, sharing with teams, setup new environment

**Quick Links in File:**
- Table: vendors (line 10)
- Table: users (line 39)
- Table: purchase_orders (line 67)
- Table: purchase_order_line_items (line 100)
- Table: po_history (line 138)
- Table: po_line_item_history (line 155)
- Relationships (line 202)

---

### 2. **DATABASE_OPERATIONS_GUIDE.md** - Comprehensive Guide  
**Size:** ~32 KB  
**Purpose:** How-to guide for all CRUD operations

**Contains:**
- Table structure details
- INSERT operations with examples (7 patterns)
- UPDATE operations with examples (10 patterns)
- DELETE operations with cautions
- Constraints explained
- Relationships documented
- Complete example code
- Connection details

**Use When:** Learning database operations, writing queries, understanding constraints

**Main Sections:**
- [INSERT Operations](#insert-operations) - Creating data
- [UPDATE Operations](#update-operations) - Modifying data
- [DELETE Operations](#delete-operations) - Removing data
- [Constraints & Relationships](#constraints--relationships)
- [Example Queries](#example-queries)

---

### 3. **DATABASE_QUICK_REFERENCE.md** - Practical Examples
**Size:** ~18 KB  
**Purpose:** Quick copy-paste examples for common operations

**Contains:**
- 7 common INSERT examples (ready to copy)
- 10 common UPDATE examples (ready to copy)
- 6 DELETE patterns with warnings
- 10 query patterns for common searches
- 6 common error solutions with fixes
- Best practices (do's and don'ts)
- Performance tips

**Use When:** Need quick examples, solving specific problems, debugging queries

**Quick Access:**
```
- Common INSERTs: Line 15
- Common UPDATEs: Line 95
- Common DELETEs: Line 210
- Query Patterns: Line 285
- Error Solutions: Line 350
```

---

## 🔍 Quick Find by Topic

### Learning Path

**Beginner:**
1. Read [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md) - Table Overview section
2. Skim [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - Table Structure section
3. Try examples from [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Common INSERTs

**Intermediate:**
1. Study [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - All sections
2. Practice examples from [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md)
3. Reference [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md) for constraints

**Advanced:**
1. Review [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - Constraints & Relationships
2. Study DELETE operations carefully
3. Optimize based on Performance Tips

---

### By Topic

#### Understanding Tables
→ [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md) - Table sections (lines 10-180)

#### Creating Data (INSERT)
→ [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - INSERT Operations (starts line 100)
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Common INSERTs (starts line 15)

#### Modifying Data (UPDATE)
→ [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - UPDATE Operations (starts line 280)
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Common UPDATEs (starts line 95)

#### Removing Data (DELETE)
→ [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - DELETE Operations (starts line 520)
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Common DELETEs (starts line 210)

#### Constraints & Foreign Keys
→ [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - Constraints section (line 680)
→ [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md) - Constraints section (line 305)

#### Error Troubleshooting
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Common Errors section (starts line 350)

#### Performance Optimization
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Performance Tips (starts line 410)

#### Query Examples
→ [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - Example Queries (line 845)
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md) - Query Patterns (line 285)

---

## 📊 Table Quick Reference

### vendors
**Purpose:** Vendor/supplier information  
**Key Fields:** id, code (unique), status, is_active  
**Relationships:** (1) → Many users, Many purchase_orders  
**Constraints:** code is UNIQUE, status IN ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED')

INSERT Example: [DATABASE_QUICK_REFERENCE.md - Create New Vendor](DATABASE_QUICK_REFERENCE.md#1-create-new-vendor)  
UPDATE Example: [DATABASE_QUICK_REFERENCE.md - Approve Pending Vendor](DATABASE_QUICK_REFERENCE.md#1-approve-pending-vendor)

---

### users
**Purpose:** Admin and vendor user accounts  
**Key Fields:** id, email (unique), role, vendor_id, is_active  
**Relationships:** Many → (1) vendor  
**Constraints:** email is UNIQUE, role IN ('ADMIN', 'VENDOR')

INSERT Example: [DATABASE_QUICK_REFERENCE.md - Create Admin User](DATABASE_QUICK_REFERENCE.md#2-create-admin-user)  
INSERT Example: [DATABASE_QUICK_REFERENCE.md - Create Vendor User](DATABASE_QUICK_REFERENCE.md#3-create-vendor-user-linked-to-vendor)

---

### purchase_orders
**Purpose:** Purchase orders from ERP  
**Key Fields:** id, po_number (unique), status, vendor_id, priority, type  
**Relationships:** Many → (1) vendor, (1) → Many line_items  
**Constraints:** po_number UNIQUE, status IN (4 values), priority IN (4 values), type IN (2 values)

INSERT Example: [DATABASE_QUICK_REFERENCE.md - Create Purchase Order](DATABASE_QUICK_REFERENCE.md#4-create-purchase-order)  
UPDATE Example: [DATABASE_QUICK_REFERENCE.md - Accept a PO](DATABASE_QUICK_REFERENCE.md#2-accept-a-po)

---

### purchase_order_line_items
**Purpose:** Line items for purchase orders  
**Key Fields:** id, po_id, product_code, quantity, price, status  
**Relationships:** Many → (1) purchase_order  
**Constraints:** quantity > 0, price >= 0, status IN (4 values)

INSERT Example: [DATABASE_QUICK_REFERENCE.md - Create Line Item](DATABASE_QUICK_REFERENCE.md#5-create-purchase-order-line-item)  
UPDATE Example: [DATABASE_QUICK_REFERENCE.md - Update Line Item Status](DATABASE_QUICK_REFERENCE.md#6-update-line-item-status)

---

### po_history
**Purpose:** Audit trail for PO changes  
**Key Fields:** id, po_id, changed_by_user_id, action_type, field_name, old_value, new_value  
**Relationships:** Many → (1) purchase_order  
**Used For:** Tracking who changed what and when

---

### po_line_item_history
**Purpose:** Audit trail for line item changes  
**Key Fields:** id, po_id, line_item_id, changed_by_user_id, action_type  
**Relationships:** Many → (1) purchase_order, Many → (1) line_item  
**Used For:** Detailed change tracking

---

## 🚀 Common Tasks

### Task: Add New Vendor

**Files to Reference:**
1. [DATABASE_QUICK_REFERENCE.md - Create New Vendor](DATABASE_QUICK_REFERENCE.md#1-create-new-vendor)
2. [DATABASE_OPERATIONS_GUIDE.md - Inserting into vendors](DATABASE_OPERATIONS_GUIDE.md#inserting-into-vendors)

**Steps:**
1. Generate UUID for vendor
2. Use INSERT query from Quick Reference
3. Create vendor user (see below)
4. Wait for approval

---

### Task: Approve Vendor

**Files to Reference:**
1. [DATABASE_QUICK_REFERENCE.md - Approve Pending Vendor](DATABASE_QUICK_REFERENCE.md#1-approve-pending-vendor)
2. [DATABASE_OPERATIONS_GUIDE.md - UPDATE vendors](DATABASE_OPERATIONS_GUIDE.md#updating-vendors)

**Steps:**
1. Update vendor status to 'ACTIVE'
2. Update associated users to is_active = true
3. Create purchase orders for vendor
4. Log change to history

---

### Task: Create Purchase Order with Line Items

**Files to Reference:**
1. [DATABASE_QUICK_REFERENCE.md - Create Purchase Order](DATABASE_QUICK_REFERENCE.md#4-create-purchase-order)
2. [DATABASE_QUICK_REFERENCE.md - Create Line Items](DATABASE_QUICK_REFERENCE.md#6-multiple-line-items-in-one-query)
3. [DATABASE_OPERATIONS_GUIDE.md - INSERT examples](DATABASE_OPERATIONS_GUIDE.md#complete-insert-example-with-all-validations)

**Steps:**
1. Verify vendor exists
2. INSERT purchase order
3. INSERT line items (can be bulk)
4. Log creation to po_history

---

### Task: Update PO Status

**Files to Reference:**
1. [DATABASE_QUICK_REFERENCE.md - Accept a PO](DATABASE_QUICK_REFERENCE.md#2-accept-a-po)
2. [DATABASE_OPERATIONS_GUIDE.md - PO status workflow](DATABASE_OPERATIONS_GUIDE.md#status-workflow-notes)

**Steps:**
1. Check current status
2. Verify next status is valid
3. UPDATE purchase_orders with new status
4. Log change to po_history

---

### Task: Find Issues/Errors

**Go to:** [DATABASE_QUICK_REFERENCE.md - Common Errors](DATABASE_QUICK_REFERENCE.md#common-errors--solutions)

**Errors Covered:**
- Duplicate key violations
- Foreign key constraint violations
- Check constraint violations
- Referential integrity errors
- Invalid email format
- Invalid quantity values

---

## 🔧 Maintenance Tasks

### Backup Database
See: [DATABASE_SCHEMA_REFERENCE.md - Backup & Restore](DATABASE_SCHEMA_REFERENCE.md#backup--restore)

### Check Database Stats
Use Query: [DATABASE_QUICK_REFERENCE.md - Count Stats](DATABASE_QUICK_REFERENCE.md#count-stats)

### Monitor Table Sizes
Use Query: [DATABASE_OPERATIONS_GUIDE.md - Current Record Counts](DATABASE_OPERATIONS_GUIDE.md#current-record-counts)

### Verify Data Integrity
See: [DATABASE_OPERATIONS_GUIDE.md - Relationships](DATABASE_OPERATIONS_GUIDE.md#table-relationships)

---

## 🎓 Learning Resources

### Understanding Database Design
- Read: [DATABASE_SCHEMA_REFERENCE.md - Relationships section](DATABASE_SCHEMA_REFERENCE.md#relationships)
- Visualize: [DATABASE_OPERATIONS_GUIDE.md - Constraints section](DATABASE_OPERATIONS_GUIDE.md#table-relationships)

### SQL Query Writing
- Learn: [DATABASE_OPERATIONS_GUIDE.md - Example Queries](DATABASE_OPERATIONS_GUIDE.md#example-queries)
- Practice: [DATABASE_QUICK_REFERENCE.md - Query Patterns](DATABASE_QUICK_REFERENCE.md#query-patterns)

### Best Practices
- Read: [DATABASE_OPERATIONS_GUIDE.md - Summary Table](DATABASE_OPERATIONS_GUIDE.md#summary-table)
- Study: [DATABASE_QUICK_REFERENCE.md - Best Practices](DATABASE_QUICK_REFERENCE.md#best-practices)

### Troubleshooting
- Reference: [DATABASE_QUICK_REFERENCE.md - Common Errors](DATABASE_QUICK_REFERENCE.md#common-errors--solutions)

---

## 📝 Documentation Stats

| Document | Size | Lines | Topics |
|----------|------|-------|--------|
| DATABASE_SCHEMA_REFERENCE.md | ~17 KB | ~344 | 6 tables, indexes, constraints, examples |
| DATABASE_OPERATIONS_GUIDE.md | ~32 KB | ~900 | INSERT, UPDATE, DELETE, constraints, examples, code |
| DATABASE_QUICK_REFERENCE.md | ~18 KB | ~500 | Quick examples, errors, performance tips |
| **Total** | **~67 KB** | **~1744** | **Complete database guide** |

---

## 🔗 Cross-References

### Connection Info
- [DATABASE_SCHEMA_REFERENCE.md - Connection Details](DATABASE_SCHEMA_REFERENCE.md#connection-details)
- [DATABASE_OPERATIONS_GUIDE.md - Connection Details](DATABASE_OPERATIONS_GUIDE.md#connection-details)

### Constraint Details
- [DATABASE_SCHEMA_REFERENCE.md - Constraints](DATABASE_SCHEMA_REFERENCE.md#constraints)
- [DATABASE_OPERATIONS_GUIDE.md - Constraints & Relationships](DATABASE_OPERATIONS_GUIDE.md#constraints--relationships)

### Index Info
- [DATABASE_SCHEMA_REFERENCE.md - Indexes Created](DATABASE_SCHEMA_REFERENCE.md#indexes-created)
- [DATABASE_QUICK_REFERENCE.md - Index Queries](DATABASE_QUICK_REFERENCE.md#index-queries)

### Data Types
- [DATABASE_SCHEMA_REFERENCE.md - Data Types Used](DATABASE_SCHEMA_REFERENCE.md#data-types-used)

---

## ✅ Verification Checklist

Before working with the database, verify:

- [ ] PostgreSQL is running (localhost:5432)
- [ ] Database name is 'vms'
- [ ] User is 'postgres'
- [ ] All 6 tables exist
- [ ] Indexes are created
- [ ] Foreign key constraints are in place
- [ ] You have backups

Run this query to verify:
```sql
SELECT 
  'vendors' as table_name, COUNT(*) FROM vendors
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'purchase_order_line_items', COUNT(*) FROM purchase_order_line_items
UNION ALL
SELECT 'po_history', COUNT(*) FROM po_history
UNION ALL
SELECT 'po_line_item_history', COUNT(*) FROM po_line_item_history;
```

---

## 🆘 Need Help?

**For schema questions:**
→ [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md)

**For operation examples:**
→ [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md)

**For deep dive:**
→ [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md)

**For error solving:**
→ [DATABASE_QUICK_REFERENCE.md - Common Errors](DATABASE_QUICK_REFERENCE.md#common-errors--solutions)

---

## 📞 Getting Started

**5 Minute Quick Start:**
1. Read: [DATABASE_QUICK_REFERENCE.md - Common INSERTs](DATABASE_QUICK_REFERENCE.md#common-insert-queries)
2. Copy first example
3. Replace UUIDs with your data
4. Run in PostgreSQL client

**30 Minute Overview:**
1. Read: [DATABASE_SCHEMA_REFERENCE.md - Tables](DATABASE_SCHEMA_REFERENCE.md#table-vendors) (first 3 tables)
2. Skim: [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md)
3. Try: Insert a vendor, then a user

**2 Hour Deep Dive:**
1. Study: [DATABASE_OPERATIONS_GUIDE.md](DATABASE_OPERATIONS_GUIDE.md) - All sections
2. Reference: [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md) - Constraints
3. Practice: Examples from [DATABASE_QUICK_REFERENCE.md](DATABASE_QUICK_REFERENCE.md)

---

**Last Updated:** January 20, 2026  
**Total Documentation:** 3 files, ~1700 lines, ~67 KB  
**Status:** Complete ✅

