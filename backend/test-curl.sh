#!/bin/bash

echo "🧪 Testing Public PO API with curl..."

# Test the public endpoint
curl -X POST http://localhost:3001/api/v1/public/pos \
  -H "Content-Type: application/json" \
  -d '{
    "po": {
      "po_number": "CURL_TEST_'$(date +%s)",
      "vendor_id": "3",
      "type": "NEW_ITEMS",
      "priority": "MEDIUM",
      "po_date": "2026-03-03"
    },
    "line_items": [
      {
        "product_code": 1001,
        "product_name": "Curl Test Product",
        "quantity": 5,
        "gst_percent": 18,
        "price": 100,
        "mrp": 120,
        "line_priority": "MEDIUM"
      }
    ]
  }' \
  -w "\n📡 Status: %{http_code} %{http_code}\n📄 Response:\n"
