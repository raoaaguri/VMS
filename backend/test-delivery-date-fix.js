import fetch from "node-fetch";

async function testOrderInfoDeliveryDate() {
  try {
    console.log("🧪 Testing Order Info Delivery Date Fix...\n");

    // Test Order Info delivery date change (should update ALL line items)
    console.log("1. Testing Order Info delivery date change...");
    const response1 = await fetch(
      "http://localhost:3001/api/v1/admin/pos/359/expected-date",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer YOUR_TOKEN_HERE",
        },
        body: JSON.stringify({
          expected_date: "2026-03-15",
        }),
      },
    );

    console.log("Order Info Delivery Date Response Status:", response1.status);
    if (response1.ok) {
      console.log("✅ Order Info delivery date update successful");
    } else {
      console.log("❌ Order Info delivery date update failed");
    }

    // Test single line item delivery date change (should update only that line item)
    console.log("\n2. Testing single line item delivery date change...");
    const response2 = await fetch(
      "http://localhost:3001/api/v1/admin/pos/359/line-items/6051/expected-date",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer YOUR_TOKEN_HERE",
        },
        body: JSON.stringify({
          expected_delivery_date: "2026-03-20",
        }),
      },
    );

    console.log("Line Item Delivery Date Response Status:", response2.status);
    if (response2.ok) {
      console.log("✅ Line item delivery date update successful");
    } else {
      console.log("❌ Line item delivery date update failed");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testOrderInfoDeliveryDate();
