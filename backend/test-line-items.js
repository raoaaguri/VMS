import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const API_URL = 'http://localhost:3001/api';

async function testAdminLineItems() {
  try {
    console.log('\n========== TESTING ADMIN LINE ITEMS ENDPOINT ==========\n');

    // First, get admin token
    console.log('1️⃣  Getting admin token...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log(`❌ Login failed: ${loginResponse.status}`);
      const error = await loginResponse.text();
      console.log(error);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log(`✅ Login successful\n`);

    // Now test the line items endpoint
    console.log('2️⃣  Fetching line items...');
    const lineItemsResponse = await fetch(`${API_URL}/admin/line-items?limit=5`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!lineItemsResponse.ok) {
      console.log(`❌ Failed: ${lineItemsResponse.status}`);
      const error = await lineItemsResponse.text();
      console.log(error);
      return;
    }

    const lineItemsData = await lineItemsResponse.json();
    console.log(`✅ Retrieved ${lineItemsData.items.length} line items\n`);

    // Check the structure of the returned data
    if (lineItemsData.items.length > 0) {
      const firstItem = lineItemsData.items[0];
      console.log('3️⃣  First line item structure:');
      console.log(JSON.stringify(firstItem, null, 2));

      console.log('\n4️⃣  Checking required fields:');
      console.log(`   ${firstItem.po_number ? '✅' : '❌'} po_number: ${firstItem.po_number}`);
      console.log(`   ${firstItem.vendor_name ? '✅' : '❌'} vendor_name: ${firstItem.vendor_name}`);
      console.log(`   ${firstItem.product_code ? '✅' : '❌'} product_code: ${firstItem.product_code}`);
      console.log(`   ${firstItem.product_name ? '✅' : '❌'} product_name: ${firstItem.product_name}`);
      console.log(`   ${firstItem.quantity ? '✅' : '❌'} quantity: ${firstItem.quantity}`);
      console.log(`   ${firstItem.line_priority ? '✅' : '❌'} line_priority: ${firstItem.line_priority}`);
      console.log(`   ${firstItem.status ? '✅' : '❌'} status: ${firstItem.status}`);
    }

    console.log('\n========== TEST COMPLETE ==========\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAdminLineItems();
