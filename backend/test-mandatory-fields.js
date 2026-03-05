import fetch from 'node-fetch';

async function testMandatoryFields() {
  try {
    console.log('🧪 Testing mandatory fields...');
    
    // Test with missing design_code
    console.log('1. Testing missing design_code...');
    const response1 = await fetch('http://localhost:3001/api/v1/public/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        po: {
          po_number: 'TEST_DESIGN_' + Date.now(),
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
          line_priority: 'MEDIUM',
          combination_code: 123,
          category: 'ELECTRONICS'
          // Missing design_code
        }]
      })
    });
    
    console.log('Missing design_code response:', response1.status, await response1.text());
    
    // Test with all mandatory fields
    console.log('2. Testing all mandatory fields...');
    const response2 = await fetch('http://localhost:3001/api/v1/public/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        po: {
          po_number: 'TEST_COMPLETE_' + Date.now(),
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
          line_priority: 'MEDIUM',
          design_code: 456, // ✅ Now mandatory
          combination_code: 789, // ✅ Now mandatory
          category: 'ELECTRONICS' // ✅ Now mandatory
        }]
      })
    });
    
    console.log('All mandatory fields response:', response2.status, await response2.text());
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMandatoryFields();
