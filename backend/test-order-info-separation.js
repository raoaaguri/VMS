import fetch from 'node-fetch';

async function testOrderInfoVsLineItemDate() {
  try {
    console.log('🧪 Testing Order Info vs Line Item Delivery Date Separation...\n');
    
    // Test 1: Update Order Info delivery date (should update PO field and all line items)
    console.log('1. Testing Order Info delivery date change...');
    const response1 = await fetch('http://localhost:3001/api/v1/admin/pos/359/expected-date', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify({
        expected_date: '2026-03-15'
      })
    });
    
    console.log('Order Info Response Status:', response1.status);
    
    // Test 2: Update single line item delivery date (should NOT affect Order Info)
    console.log('\n2. Testing single line item delivery date change...');
    const response2 = await fetch('http://localhost:3001/api/v1/admin/pos/359/line-items/6051/expected-date', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify({
        expected_delivery_date: '2026-03-20'
      })
    });
    
    console.log('Line Item Response Status:', response2.status);
    
    console.log('\n📋 Expected Behavior:');
    console.log('✅ Order Info change: Updates PO.expected_delivery_date + ALL line items');
    console.log('✅ Line item change: Updates ONLY that line item, PO.expected_delivery_date unchanged');
    console.log('✅ Frontend: Order Info shows po.expected_delivery_date (not line_items[0].expected_delivery_date)');
    
    console.log('\n🔗 External API Calls:');
    console.log('Order Info: combinationNumber: null');
    console.log('Line Item: combinationNumber: lineItem.combination_code');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOrderInfoVsLineItemDate();
