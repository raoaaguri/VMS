# Dummy Data Population & Frontend Display Guide

## Overview

This guide explains how to populate dummy data in the newly added line item columns and how the frontend handles missing data.

## What Changed

### Backend

- **File**: `backend/populate-dummy-data.js`
  - Script to populate realistic dummy data in all new line item columns
  - 70% of line items will have data, 30% will have null values (to test "-" display)

### Frontend

- **File**: `src/pages/vendor/VendorPoDetail.jsx`
  - Updated table rows to display all new columns
  - Implemented conditional rendering to show "-" for missing/null data

## New Columns Added to Display

The vendor PO detail page now displays these columns in order:

1. **Design Code** - `item.design_code || '-'`
2. **Combination Code** - `item.combination_code || '-'`
3. **Product Name** - `item.product_name`
4. **Style** - `item.style || '-'`
5. **Sub-Style** - `item.sub_style || '-'`
6. **Region** - `item.region || '-'`
7. **Color** - `item.color || '-'`
8. **Sub-Color** - `item.sub_color || '-'`
9. **Polish** - `item.polish || '-'`
10. **Size** - `item.size || '-'`
11. **Weight** - `item.weight || '-'`
12. **Quantity** - `item.quantity`
13. **Received Qty** - `item.received_qty || 0`
14. **GST%** - `item.gst_percent%`
15. **Price** - `item.price`
16. **MRP** - `item.mrp`
17. **Expected Date** - Date field (editable)
18. **Status** - Status badge
19. **Actions** - Status update dropdown

## How to Populate Dummy Data

### Step 1: Run the Migration Script

First, ensure the columns exist in the database:

```bash
cd backend
node run-line-items-migration.js
```

### Step 2: Populate Dummy Data

```bash
cd backend
node populate-dummy-data.js
```

This script will:

- Get all existing line items from the database
- Add realistic dummy data to ~70% of them
- Leave ~30% with null values (which will display as "-" in the frontend)
- Display a progress bar and summary

Expected output:

```
Starting to populate dummy data in line items...
Found 45 line items to update
✓ Updated line item 1/45
✓ Updated line item 2/45
...
✓ Dummy data population complete!
  - Successfully updated: 45
  - Failed: 0

Note: ~30% of line items have null values to test the "-" display in frontend
```

## Sample Dummy Data

The script uses these sample values:

### Design Codes

- DC-001, DC-002, DC-003, DC-004, DC-005

### Combination Codes

- CC-A, CC-B, CC-C, CC-D, CC-E

### Styles

- Modern, Classic, Contemporary, Traditional, Minimalist

### Sub-Styles

- Geometric, Floral, Abstract, Solid, Pattern

### Regions

- North, South, East, West, Central

### Colors

- Red, Blue, Green, Yellow, Black, White, Brown

### Sub-Colors

- Dark Red, Light Blue, Lime Green, Golden Yellow, Jet Black

### Polishes

- Matte, Glossy, Semi-Gloss, Satin, Mirror

### Sizes

- Small, Medium, Large, XL, XXL

### Weight

- Random values between 0.5 and 10 (kg)

### Received Qty

- Random values between 0 and 100

## Frontend Display Examples

### Example 1: Item with Complete Data

```
Design Code: DC-002
Combination Code: CC-C
Style: Modern
Sub-Style: Geometric
Region: South
Color: Blue
Sub-Color: Light Blue
Polish: Matte
Size: Large
Weight: 5.27
```

### Example 2: Item with Partial/Missing Data (displays "-")

```
Design Code: -
Combination Code: -
Style: -
Sub-Style: -
Region: North
Color: -
Sub-Color: -
Polish: Glossy
Size: -
Weight: -
```

## Frontend Implementation

The frontend uses the OR operator (`||`) to check for null/undefined values:

```jsx
<td className="px-4 py-3 text-sm text-gray-900">{item.design_code || "-"}</td>
```

This means:

- If `item.design_code` has a value, display it
- If `item.design_code` is null/undefined/empty, display "-"

Same logic applies to all new columns except:

- `received_qty` defaults to 0 if not set
- `quantity`, `gst_percent`, `price`, `mrp` always have values

## Verification Steps

### 1. Check Database Has Data

```sql
SELECT id, design_code, combination_code, style, received_qty
FROM purchase_order_line_items
LIMIT 5;
```

### 2. Verify API Response

Call `/api/v1/vendor/pos/{posId}` and check the response includes all new fields in line_items array.

### 3. Check Frontend Display

- Navigate to vendor PO detail page
- Scroll right in the table to see all new columns
- Verify some show "-" and some show actual data
- Verify received_qty shows "0" when null, not "-"

## Notes

- The dummy data population is idempotent - you can run it multiple times
- Each run will randomly assign data (70% populated, 30% null)
- To clear all dummy data and reset to NULL:
  ```sql
  UPDATE purchase_order_line_items
  SET design_code = NULL, combination_code = NULL, style = NULL,
      sub_style = NULL, region = NULL, color = NULL,
      sub_color = NULL, polish = NULL, size = NULL,
      weight = NULL, received_qty = 0;
  ```
