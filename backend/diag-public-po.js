import fetch from 'node-fetch';

async function diagnosePublicPo() {
  const url = 'http://localhost:3001/api/v1/public/pos';
  const payload = {
    po: {
      po_number: "DIAG" + Date.now(),
      vendor_code: "V001", // Assuming V001 exists from previous tasks
      type: "NEW_ITEMS",
      priority: "MEDIUM",
      po_date: "2026-03-10"
    },
    line_items: [
      {
        product_code: "P001",
        product_name: "Diag Product",
        design_code: "D001",
        combination_code: "C001",
        category: "General",
        quantity: 10,
        gst_percent: 18,
        price: 100,
        mrp: 120,
        line_priority: "MEDIUM"
      }
    ]
  };

  console.log(`📡 Sending request to ${url}...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('📄 Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Fetch Error:', error);
    if (error.code) console.error('Error Code:', error.code);
  }
}

diagnosePublicPo();
