import fetch from 'node-fetch';

async function testPublicCreatePo() {
  try {
    console.log('🧪 Testing Public Create PO API (No Auth)...');

    const testPayload = {
      po: {
        po_number: "PUBLIC" + Date.now(),
        vendor_id: "3",
        type: "NEW_ITEMS",
        priority: "MEDIUM",
        po_date: "2026-03-03"
      },
      line_items: [
        {
          product_code: 1001,
          product_name: "Public Test Product",
          quantity: 10,
          gst_percent: 18,
          price: 100,
          mrp: 120,
          line_priority: "MEDIUM"
        }
      ]
    };

    console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));

    // Call public API without auth
    const response = await fetch('http://localhost:3001/api/v1/public/pos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header needed!
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log('📄 Response:', JSON.stringify(responseData, null, 2));

    if (response.status === 201) {
      console.log('✅ Public PO API works without authentication!');
      console.log('🎉 PO Created:', responseData.po_number);
    } else {
      console.log('❌ PO Creation failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPublicCreatePo();
