import fetch from "node-fetch";

async function quickTest() {
  try {
    console.log("🧪 Quick test of public PO API...");

    const response = await fetch("http://localhost:3001/api/v1/public/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        po: {
          po_number: "QUICK_TEST_" + Date.now(),
          vendor_code: "GLOB001", // Use vendor_code instead of vendor_id
          type: "NEW_ITEMS",
          priority: "MEDIUM",
          po_date: "2026-03-05",
        },
        line_items: [
          {
            product_code: 1001,
            product_name: "Quick Test",
            quantity: 5,
            gst_percent: 18,
            price: 100,
            mrp: 120,
            line_priority: "MEDIUM",
          },
        ],
      }),
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log("Response:", text.substring(0, 200) + "...");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

quickTest();
