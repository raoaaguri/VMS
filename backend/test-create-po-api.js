import fetch from "node-fetch";

// Configuration
const API_BASE_URL = "http://localhost:3001/api/v1";
const ADMIN_EMAIL = "admin@example.com"; // Correct admin email
const ADMIN_PASSWORD = "admin123"; // Updated admin password

// Test data
const testPayload = {
  po: {
    po_number: "TEST" + Date.now(), // Unique PO number
    vendor_id: "3", // Replace with a valid vendor ID from your database
    type: "NEW_ITEMS",
    priority: "MEDIUM",
    po_date: "2026-03-03",
  },
  line_items: [
    {
      product_code: 1001, // Must be integer
      product_name: "Test Product 1",
      quantity: 10,
      gst_percent: 18.0,
      price: 100.0,
      mrp: 120.0,
      line_priority: "MEDIUM",
      expected_delivery_date: "2026-03-10",
    },
    {
      product_code: 1002, // Must be integer
      product_name: "Test Product 2",
      quantity: 5,
      gst_percent: 18.0,
      price: 50.0,
      mrp: 60.0,
      line_priority: "LOW",
      expected_delivery_date: "2026-03-15",
    },
  ],
};

async function testCreatePo() {
  try {
    console.log("🧪 Testing Create PO API...");
    console.log("📋 Test Payload:");
    console.log(JSON.stringify(testPayload, null, 2));
    console.log("\n");

    // Step 1: Login to get auth token
    console.log("🔐 Logging in as admin...");
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(
        `Login failed: ${loginResponse.status} ${loginResponse.statusText}`,
      );
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log("✅ Login successful! Token received.");

    // Step 2: Create PO
    console.log("📝 Creating PO...");
    const createResponse = await fetch(`${API_BASE_URL}/admin/pos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(
      `📡 Response Status: ${createResponse.status} ${createResponse.statusText}`,
    );

    const responseData = await createResponse.json();
    console.log("📄 Response Data:");
    console.log(JSON.stringify(responseData, null, 2));

    // Step 3: Validate response
    if (createResponse.status === 201) {
      console.log("\n✅ PO Created Successfully!");
      console.log("📋 Validation Results:");
      console.log("  - PO Number:", responseData.po_number || "❌ Missing");
      console.log("  - PO Status:", responseData.status || "❌ Missing");
      console.log(
        "  - Vendor Status:",
        responseData.vendor_status || "❌ Missing",
      );
      console.log(
        "  - Line Items Count:",
        responseData.line_items?.length || "❌ Missing",
      );
      console.log(
        "  - Vendor Info:",
        responseData.vendor ? "✅ Present" : "❌ Missing",
      );

      if (responseData.line_items && responseData.line_items.length > 0) {
        console.log("  - First Line Item:");
        console.log(
          "    Product:",
          responseData.line_items[0].product_name || "❌ Missing",
        );
        console.log(
          "    Quantity:",
          responseData.line_items[0].quantity || "❌ Missing",
        );
        console.log(
          "    Status:",
          responseData.line_items[0].status || "❌ Missing",
        );
      }

      console.log("\n🎉 Test completed successfully!");
    } else {
      console.log("\n❌ PO Creation Failed!");
      console.log("Error:", responseData.message || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Helper function to get valid vendor ID
async function getValidVendorId() {
  try {
    console.log("🔍 Getting valid vendor ID...");
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Get first vendor from existing POs
    const posResponse = await fetch(`${API_BASE_URL}/admin/pos?limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (posResponse.ok) {
      const posData = await posResponse.json();
      if (
        posData.data &&
        posData.data.length > 0 &&
        posData.data[0].vendor_id
      ) {
        console.log("✅ Found vendor ID:", posData.data[0].vendor_id);
        return posData.data[0].vendor_id;
      }
    }

    console.log('⚠️  Could not get vendor ID, using default "3"');
    return "3";
  } catch (error) {
    console.log(
      '⚠️  Error getting vendor ID, using default "3":',
      error.message,
    );
    return "3";
  }
}

// Main execution
async function main() {
  // Get valid vendor ID first
  const validVendorId = await getValidVendorId();
  testPayload.po.vendor_id = validVendorId;

  // Run the test
  await testCreatePo();
}

main();
