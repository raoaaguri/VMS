import fetch from "node-fetch";

async function testPriorityAPI() {
  try {
    console.log("🧪 Testing Priority API Implementation...\n");

    // Test 1: Update PO priority (should send combinationNumber: null)
    console.log("1. Testing PO priority update...");
    const poResponse = await fetch(
      "http://localhost:3001/api/v1/admin/pos/359/priority",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer YOUR_TOKEN_HERE", // You'll need to get a valid token
        },
        body: JSON.stringify({
          priority: "HIGH",
        }),
      },
    );

    console.log("PO Priority Response Status:", poResponse.status);
    if (poResponse.ok) {
      console.log("✅ PO priority update successful");
    } else {
      console.log("❌ PO priority update failed");
    }

    // Test 2: Update line item priority (should send combination_code)
    console.log("\n2. Testing line item priority update...");
    const lineItemResponse = await fetch(
      "http://localhost:3001/api/v1/admin/pos/359/line-items/6051/priority",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer YOUR_TOKEN_HERE", // You'll need to get a valid token
        },
        body: JSON.stringify({
          priority: "URGENT",
        }),
      },
    );

    console.log("Line Item Priority Response Status:", lineItemResponse.status);
    if (lineItemResponse.ok) {
      console.log("✅ Line item priority update successful");
    } else {
      console.log("❌ Line item priority update failed");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testPriorityAPI();
