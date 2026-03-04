import fetch from 'node-fetch';

const API_BASE_URL = "http://localhost:3001/api/v1";

async function simpleTest() {
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "admin123"
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful!');

    // Simple test payload
    const simplePayload = {
      po: {
        po_number: "TEST" + Date.now(),
        vendor_id: "3",
        type: "NEW_ITEMS",
        priority: "MEDIUM",
        po_date: "2026-03-03"
      },
      line_items: [
        {
          product_code: 1001,
          product_name: "Test Product",
          quantity: 10,
          gst_percent: 18,
          price: 100,
          mrp: 120,
          line_priority: "MEDIUM"
        }
      ]
    };

    console.log('📝 Creating PO with simple payload...');
    console.log(JSON.stringify(simplePayload, null, 2));

    const createResponse = await fetch(`${API_BASE_URL}/admin/pos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(simplePayload)
    });

    console.log(`📡 Status: ${createResponse.status} ${createResponse.statusText}`);
    
    const responseText = await createResponse.text();
    console.log('📄 Response:', responseText);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleTest();
