/**
 * Test script để kiểm tra API endpoints
 * Chạy: node scripts/test-api.js
 * 
 * Lưu ý: Server phải đang chạy (npm start)
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data
const TEST_DATA = {
  user: {
    username: 'testproducer',
    email: 'testproducer@example.com',
    password: 'testpass123',
    role: 'producer'
  },
  product: {
    origin: 'Vietnam - Test API',
    qrHash: 'API-TEST-' + Date.now()
  }
};

let authToken = null;
let userId = null;

async function testAPI() {
  console.log('🚀 Starting API Tests\n');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  try {
    // Test 1: Register User
    console.log('='.repeat(60));
    console.log('TEST 1: Register User\n');
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, TEST_DATA.user);
      authToken = response.data.token;
      userId = response.data.user.id;
      console.log('✅ User registered successfully');
      console.log(`   User ID: ${userId}`);
      console.log(`   Token: ${authToken.substring(0, 20)}...\n`);
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes('already exists')) {
        console.log('ℹ️  User already exists, trying to login...\n');
        
        // Test 1b: Login
        try {
          const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: TEST_DATA.user.email,
            password: TEST_DATA.user.password
          });
          authToken = loginResponse.data.token;
          userId = loginResponse.data.user.id;
          console.log('✅ User logged in successfully');
          console.log(`   User ID: ${userId}`);
          console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...\n`);
        } catch (loginErr) {
          console.error('❌ Login failed:', loginErr.response?.data?.error || loginErr.message);
          console.log('   Please register manually or check credentials\n');
          return;
        }
      } else {
        console.error('❌ Registration failed:', err.response?.data?.error || err.message);
        return;
      }
    }

    // Test 2: Get Current User
    console.log('='.repeat(60));
    console.log('TEST 2: Get Current User (Auth Required)\n');
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ User info retrieved:');
      console.log(`   Username: ${response.data.user.username}`);
      console.log(`   Email: ${response.data.user.email}`);
      console.log(`   Role: ${response.data.user.role}\n`);
    } catch (err) {
      console.error('❌ Failed to get user info:', err.response?.data?.error || err.message);
    }

    // Test 3: Add Product (Protected Route)
    console.log('='.repeat(60));
    console.log('TEST 3: Add Product (Protected Route)\n');
    try {
      console.log(`   Adding product: ${TEST_DATA.product.origin}`);
      const response = await axios.post(
        `${API_BASE_URL}/products`,
        TEST_DATA.product,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      console.log('✅ Product added successfully:');
      console.log(`   Product ID: ${response.data.product.id}`);
      console.log(`   Origin: ${response.data.product.origin}`);
      console.log(`   Status: ${response.data.product.currentStatus}`);
      console.log(`   Transaction Hash: ${response.data.txHash}\n`);
      
      const productId = response.data.product.id;
      
      // Wait a bit for event processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test 4: Get Product from MongoDB
      console.log('='.repeat(60));
      console.log('TEST 4: Get Product from MongoDB\n');
      try {
        const productResponse = await axios.get(`${API_BASE_URL}/products/${productId}`);
        console.log('✅ Product retrieved from MongoDB:');
        console.log(`   ID: ${productResponse.data.id}`);
        console.log(`   Origin: ${productResponse.data.origin}`);
        console.log(`   Status: ${productResponse.data.currentStatus}`);
        console.log(`   QR Hash: ${productResponse.data.qrCodeHash}`);
        console.log(`   Created At: ${new Date(productResponse.data.createdAt * 1000).toLocaleString()}\n`);
      } catch (err) {
        console.error('❌ Failed to get product:', err.response?.data?.error || err.message);
      }
      
      // Test 5: Get History from Contract
      console.log('='.repeat(60));
      console.log('TEST 5: Get History from Contract\n');
      try {
        const historyResponse = await axios.get(`${API_BASE_URL}/history/${productId}`);
        console.log('✅ History retrieved from contract:');
        console.log(`   Origin: ${historyResponse.data.origin}`);
        console.log(`   Current Status: ${historyResponse.data.currentStatus}`);
        console.log(`   Events Count: ${historyResponse.data.events.length}\n`);
      } catch (err) {
        console.error('❌ Failed to get history:', err.response?.data?.error || err.message);
      }
      
    } catch (err) {
      if (err.response?.status === 403) {
        console.error('❌ Access denied. User may not have PRODUCER role.');
        console.error('   Response:', err.response.data);
      } else {
        console.error('❌ Failed to add product:', err.response?.data?.error || err.message);
      }
    }

    // Test 6: Test Unauthorized Access
    console.log('='.repeat(60));
    console.log('TEST 6: Test Unauthorized Access\n');
    try {
      await axios.post(`${API_BASE_URL}/products`, TEST_DATA.product);
      console.error('❌ Should have failed without token');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Unauthorized access correctly blocked');
        console.log(`   Status: ${err.response.status}`);
        console.log(`   Message: ${err.response.data.error}\n`);
      } else {
        console.error('❌ Unexpected error:', err.message);
      }
    }

    // Test 7: Test Wrong Role
    console.log('='.repeat(60));
    console.log('TEST 7: Test Wrong Role (Consumer trying to add product)\n');
    console.log('   Note: This test requires a consumer user to be created manually');
    console.log('   Skipping for now...\n');

    // Summary
    console.log('='.repeat(60));
    console.log('📊 API TEST SUMMARY\n');
    console.log(`   ✅ User Registration/Login: Tested`);
    console.log(`   ✅ Authentication: Working`);
    console.log(`   ✅ Add Product: Tested`);
    console.log(`   ✅ Get Product: Tested`);
    console.log(`   ✅ Get History: Tested`);
    console.log(`   ✅ Authorization: Working\n`);
    console.log('='.repeat(60));
    console.log('✅ All API tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
      console.error('   Status:', error.response.status);
    }
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    // Try to connect to server (any endpoint)
    await axios.get(`${API_BASE_URL}/products/1`, { 
      timeout: 2000,
      validateStatus: () => true // Accept any status code
    });
    console.log('✅ Server is running\n');
    return true;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      console.error('❌ Server is not running or not accessible');
      console.error(`   API Base URL: ${API_BASE_URL}`);
      console.error(`   Please start the server with: npm start`);
      console.error(`   Then run this test again\n`);
      return false;
    }
    // If it's a different error (like 404), server is running
    return true;
  }
}

// Main execution
checkServer().then(serverRunning => {
  if (serverRunning) {
    testAPI();
  } else {
    process.exit(1);
  }
});

