# Public GRN API Documentation

## 📦 **Public Quantity Update API**

### **🔗 Endpoint:**

```
POST /api/v1/public/pos/update-quantity
```

### **🔐 Authentication:**

**No authentication required** - Public API

### **📋 Request Body:**

```javascript
[
  {
    poNumber: "WHBLR-PO-46",
    combinationCode: "600138",
    totalQty: 100,
    receivedQty: 50,
  },
  {
    poNumber: "WHBLR-PO-47",
    combinationCode: "600139",
    totalQty: 200,
    receivedQty: 150,
  },
];
```

### **✅ Response (Success):**

```javascript
{
  "success": true,
  "totalProcessed": 2,
  "successCount": 2,
  "errorCount": 0,
  "results": [
    {
      "poNumber": "WHBLR-PO-46",
      "combinationCode": "600138",
      "success": true,
      "lineItemId": "uuid-123",
      "updatedData": {
        "totalQty": 100,
        "receivedQty": 50
      }
    }
  ],
  "errors": []
}
```

### **❌ Response (Errors):**

```javascript
{
  "success": false,
  "totalProcessed": 2,
  "successCount": 1,
  "errorCount": 1,
  "results": [...],
  "errors": [
    {
      "poNumber": "WHBLR-PO-47",
      "combinationCode": "600139",
      "error": "PO not found"
    }
  ]
}
```

### **🚀 Usage Example:**

```javascript
// Public API Call - No auth needed
const response = await fetch(
  "http://vms2.technoboost.in:3000/api/v1/public/pos/update-quantity",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        poNumber: "WHBLR-PO-46",
        combinationCode: "600138",
        totalQty: 100,
        receivedQty: 50,
      },
    ]),
  },
);
```

### **🔧 Database Updates:**

- **Line Item Table:** Updates `quantity` and `received_qty` columns only
- **PO Lookup:** Finds PO by `po_number` first
- **Item Lookup:** Updates line item by `combination_code` within that PO
- **No pending_qty** - Column doesn't exist in database

### **📊 Features:**

- ✅ **Public Access** - No authentication required
- ✅ **Batch Processing** - Multiple updates in single request
- ✅ **Validation** - Checks PO exists, quantities are numbers
- ✅ **Error Handling** - Detailed success/error reporting
- ✅ **Logging** - Tracks public API calls
