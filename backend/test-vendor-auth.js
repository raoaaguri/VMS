import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001/api';

// Test credentials
const testUsers = {
  'vendor@acme.com': {
    email: 'vendor@acme.com',
    password: 'vendor123',
    vendorName: 'Acme Corporation'
  },
  'kbc@example.com': {
    email: 'kbc@example.com',
    password: 'vendor123',
    vendorName: 'KBC'
  }
};

const testPOs = {
  acme: 'f868eb38-21d3-4c1b-b7d7-5b31a2d59091', // PO-2026-108
  kbc: '2b124d95-e85b-4b41-bbe0-d4dfc092d071'    // PO-2026-110
};

async function testVendorAuthorization() {
  console.log('\n========== TESTING VENDOR AUTHORIZATION ==========\n');

  try {
    // Test 1: Login as vendor@acme.com
    console.log('1️⃣  LOGIN TEST: vendor@acme.com');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUsers['vendor@acme.com'].email,
        password: testUsers['vendor@acme.com'].password
      })
    });

    if (!loginResponse.ok) {
      console.log(`   ❌ Login failed: ${loginResponse.status}`);
      return;
    }

    const loginData = await loginResponse.json();
    const acmeToken = loginData.token;
    console.log(`   ✅ Login successful, token: ${acmeToken.substring(0, 20)}...`);

    // Test 2: Vendor tries to GET their own PO
    console.log('\n2️⃣  GET OWN PO TEST: vendor@acme.com accessing their own PO');
    const ownPoResponse = await fetch(`${API_URL}/vendor/pos/${testPOs.acme}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${acmeToken}` }
    });

    if (ownPoResponse.ok) {
      console.log(`   ✅ Successfully retrieved own PO (200 OK)`);
    } else {
      console.log(`   ❌ Failed: ${ownPoResponse.status} ${ownPoResponse.statusText}`);
    }

    // Test 3: Vendor tries to GET other vendor's PO
    console.log('\n3️⃣  GET OTHER VENDOR PO TEST: vendor@acme.com accessing KBC PO');
    const otherPoResponse = await fetch(`${API_URL}/vendor/pos/${testPOs.kbc}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${acmeToken}` }
    });

    if (otherPoResponse.status === 403) {
      console.log(`   ✅ Correctly denied access (403 Forbidden)`);
    } else {
      console.log(`   ❌ Should get 403 but got: ${otherPoResponse.status}`);
    }

    // Test 4: Get line items from own PO
    console.log('\n4️⃣  LINE ITEMS TEST: Fetch line items from own PO');
    const lineItemsResponse = await fetch(`${API_URL}/vendor/pos/${testPOs.acme}/line-items`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${acmeToken}` }
    });

    if (lineItemsResponse.ok) {
      const lineItemsData = await lineItemsResponse.json();
      console.log(`   ✅ Retrieved ${lineItemsData.length} line items`);
      if (lineItemsData.length > 0) {
        const firstLineItem = lineItemsData[0];
        console.log(`      Sample line item: ID ${firstLineItem.id}, Status: ${firstLineItem.status}`);
      }
    } else {
      console.log(`   ❌ Failed: ${lineItemsResponse.status}`);
    }

    // Test 5: Try to update expected delivery date (should work if line items exist)
    if (lineItemsResponse.ok) {
      const lineItemsData = await lineItemsResponse.json();
      if (lineItemsData.length > 0) {
        const lineItemId = lineItemsData[0].id;
        console.log('\n5️⃣  UPDATE EXPECTED DATE TEST: Update line item date');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const updateResponse = await fetch(
          `${API_URL}/vendor/pos/${testPOs.acme}/line-items/${lineItemId}/expected-delivery-date`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${acmeToken}`
            },
            body: JSON.stringify({ expected_delivery_date: dateStr })
          }
        );

        if (updateResponse.ok) {
          console.log(`   ✅ Successfully updated line item date (200 OK)`);
        } else {
          const errorData = await updateResponse.text();
          console.log(`   ❌ Update failed: ${updateResponse.status} - ${errorData}`);
        }
      }
    }

    console.log('\n========== TEST COMPLETE ==========\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testVendorAuthorization();
