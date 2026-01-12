import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001/api';

async function testLogin() {
  try {
    console.log('\n========== TESTING LOGIN ENDPOINT ==========\n');
    console.log('API URL:', API_URL);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.log('Error:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Login successful!');
    console.log('Token:', data.token ? data.token.substring(0, 30) + '...' : 'N/A');
    console.log('User:', {
      id: data.user?.id,
      email: data.user?.email,
      role: data.user?.role
    });

    console.log('\n========== TEST COMPLETE ==========\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testLogin();
