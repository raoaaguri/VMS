import fetch from 'node-fetch';

async function testVendorCode() {
  try {
    console.log('🧪 Testing vendor_code lookup...');
    
    // Test with invalid vendor code
    console.log('1. Testing invalid vendor code...');
    const response1 = await fetch('http://localhost:3001/api/v1/public/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        po: {
          po_number: 'TEST_INVALID_' + Date.now(),
          vendor_code: 'INVALID_CODE',
          type: 'NEW_ITEMS',
          priority: 'MEDIUM',
          po_date: '2026-03-05'
        },
        line_items: [{
          product_code: 1001,
          product_name: 'Test Product',
          quantity: 5,
          gst_percent: 18,
          price: 100,
          mrp: 120,
          line_priority: 'MEDIUM'
        }]
      })
    });
    
    console.log('Invalid code response:', response1.status, await response1.text());
    
    // Test with valid vendor code
    console.log('2. Testing valid vendor code...');
    const response2 = await fetch('http://localhost:3001/api/v1/public/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        po: {
          po_number: 'TEST_VALID_' + Date.now(),
          vendor_code: 'GLOB001',
          type: 'NEW_ITEMS',
          priority: 'MEDIUM',
          po_date: '2026-03-05'
        },
        line_items: [{
          product_code: 1001,
          product_name: 'Test Product',
          quantity: 5,
          gst_percent: 18,
          price: 100,
          mrp: 120,
          line_priority: 'MEDIUM'
        }]
      })
    });
    
    console.log('Valid code response:', response2.status, await response2.text());
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVendorCode();
