#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:3001/api/v1/admin"
ADMIN_EMAIL="admin@example.com"  # Replace with your admin email
ADMIN_PASSWORD="admin123"        # Replace with your admin password

echo "🧪 Testing Create PO API with curl..."

# Step 1: Login and get token
echo "🔐 Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Login successful! Token received."

# Step 2: Create PO with test data
echo "📝 Creating PO..."

PO_NUMBER="TEST$(date +%s)"
VENDOR_ID="3"  # Replace with valid vendor ID

PAYLOAD=$(cat <<EOF
{
  "po": {
    "po_number": "${PO_NUMBER}",
    "vendor_id": "${VENDOR_ID}",
    "type": "NEW_ITEMS",
    "priority": "MEDIUM",
    "po_date": "2026-03-03"
  },
  "line_items": [
    {
      "product_code": 1001,
      "product_name": "Test Product 1",
      "quantity": 10,
      "gst_percent": 18.0,
      "price": 100.00,
      "mrp": 120.00,
      "line_priority": "MEDIUM",
      "expected_delivery_date": "2026-03-10"
    },
    {
      "product_code": 1002,
      "product_name": "Test Product 2",
      "quantity": 5,
      "gst_percent": 18.0,
      "price": 50.00,
      "mrp": 60.00,
      "line_priority": "LOW",
      "expected_delivery_date": "2026-03-15"
    }
  ]
}
EOF
)

echo "📋 Sending payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"

# Make the API call
echo ""
echo "📡 Sending POST request..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${API_BASE_URL}/pos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "$PAYLOAD")

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:.*//')

echo "📡 Response Status: $HTTP_STATUS"
echo "📄 Response Body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

# Validate response
if [ "$HTTP_STATUS" = "201" ]; then
  echo ""
  echo "✅ PO Created Successfully!"
  echo "📋 Validation:"
  
  PO_NUM_RESPONSE=$(echo "$RESPONSE_BODY" | grep -o '"po_number":"[^"]*"' | cut -d'"' -f4)
  PO_STATUS=$(echo "$RESPONSE_BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  VENDOR_STATUS=$(echo "$RESPONSE_BODY" | grep -o '"vendor_status":[^,}]*' | cut -d: -f2)
  
  echo "  - PO Number: ${PO_NUM_RESPONSE:-'❌ Missing'}"
  echo "  - PO Status: ${PO_STATUS:-'❌ Missing'}"
  echo "  - Vendor Status: ${VENDOR_STATUS:-'null'}"
  
  LINE_ITEMS_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"line_items":\[[^]]*\]' | grep -o '{' | wc -l)
  echo "  - Line Items Count: $LINE_ITEMS_COUNT"
  
  echo ""
  echo "🎉 Test completed successfully!"
else
  echo ""
  echo "❌ PO Creation Failed!"
  echo "Error: $(echo "$RESPONSE_BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || 'Unknown error')"
fi
