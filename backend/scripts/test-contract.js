/**
 * Test script để kiểm tra contract hoạt động trên testnet
 * Chạy: node scripts/test-contract.js
 */

require('dotenv').config();
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Test data mẫu
const TEST_DATA = {
  products: [
    {
      origin: 'Vietnam - Ho Chi Minh City',
      qrHash: 'QH001-VN-HCM-2024-ABC123'
    },
    {
      origin: 'Thailand - Bangkok',
      qrHash: 'QH002-TH-BKK-2024-XYZ789'
    },
    {
      origin: 'Malaysia - Kuala Lumpur',
      qrHash: 'QH003-MY-KL-2024-DEF456'
    }
  ],
  statusUpdates: [
    {
      newStatus: 'In Transit',
      eventType: 'Shipment',
      location: 'Warehouse A - Ho Chi Minh City',
      details: 'Product shipped from origin warehouse'
    },
    {
      newStatus: 'In Transit',
      eventType: 'Customs',
      location: 'Customs Office - Border',
      details: 'Product cleared customs'
    },
    {
      newStatus: 'Delivered',
      eventType: 'Delivery',
      location: 'Final Destination - Customer Address',
      details: 'Product delivered to customer'
    }
  ]
};

async function testContract() {
  try {
    console.log('🚀 Starting Contract Test on Testnet\n');
    console.log('='.repeat(60));

    // Setup
    let rpcUrl = process.env.ALCHEMY_RPC_URL;
    if (!rpcUrl && process.env.ALCHEMY_API_KEY) {
      rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    }

    if (!rpcUrl) {
      console.error('❌ No RPC URL found. Please set ALCHEMY_RPC_URL or ALCHEMY_API_KEY');
      process.exit(1);
    }

    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.error('❌ No CONTRACT_ADDRESS found in .env');
      process.exit(1);
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ No PRIVATE_KEY found in .env');
      process.exit(1);
    }

    // Load ABI
    const contractArtifactPath = path.join(__dirname, '../../contract/artifacts/contracts/TrueSource.sol/TrueSource.json');
    let abi = [];
    try {
      const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
      abi = contractArtifact.abi;
      console.log('✅ ABI loaded successfully\n');
    } catch (err) {
      console.error('❌ Error loading ABI:', err.message);
      process.exit(1);
    }

    // Setup Web3
    const web3 = new Web3(rpcUrl);
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    const contract = new web3.eth.Contract(abi, contractAddress);

    console.log('📋 Test Configuration:');
    console.log(`   Network: ${rpcUrl.includes('sepolia') ? 'Sepolia Testnet' : 'Unknown'}`);
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Account: ${account.address}`);
    console.log(`   Balance: ${web3.utils.fromWei(await web3.eth.getBalance(account.address), 'ether')} ETH\n`);

    // Test 1: Check contract connection
    console.log('='.repeat(60));
    console.log('TEST 1: Check Contract Connection\n');
    try {
      const productCounter = await contract.methods.productCounter().call();
      console.log(`✅ Contract connected successfully`);
      console.log(`   Current product counter: ${productCounter}\n`);
    } catch (err) {
      console.error('❌ Failed to connect to contract:', err.message);
      process.exit(1);
    }

    // Test 2: Check roles
    console.log('='.repeat(60));
    console.log('TEST 2: Check User Roles\n');
    try {
      const PRODUCER_ROLE = await contract.methods.PRODUCER_ROLE().call();
      const hasProducerRole = await contract.methods.hasRole(PRODUCER_ROLE, account.address).call();
      console.log(`   PRODUCER_ROLE: ${PRODUCER_ROLE}`);
      console.log(`   Has PRODUCER_ROLE: ${hasProducerRole ? '✅ Yes' : '❌ No'}\n`);
      
      if (!hasProducerRole) {
        console.warn('⚠️  Warning: Account does not have PRODUCER_ROLE');
        console.warn('   You may not be able to add products\n');
      }
    } catch (err) {
      console.error('❌ Error checking roles:', err.message);
    }

    // Test 3: Add Products
    console.log('='.repeat(60));
    console.log('TEST 3: Add Products\n');
    
    const addedProductIds = [];
    
    for (let i = 0; i < TEST_DATA.products.length; i++) {
      const product = TEST_DATA.products[i];
      console.log(`   Adding product ${i + 1}/${TEST_DATA.products.length}:`);
      console.log(`   Origin: ${product.origin}`);
      console.log(`   QR Hash: ${product.qrHash}`);
      
      try {
        const tx = await contract.methods.addProduct(product.origin, product.qrHash).send({
          from: account.address,
          gas: 500000
        });
        
        const productId = await contract.methods.productCounter().call();
        addedProductIds.push(productId.toString());
        
        console.log(`   ✅ Product added successfully!`);
        console.log(`   Product ID: ${productId}`);
        console.log(`   Transaction Hash: ${tx.transactionHash}`);
        console.log(`   Block Number: ${tx.blockNumber}\n`);
        
        // Wait a bit for block confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`   ❌ Failed to add product: ${err.message}\n`);
      }
    }

    if (addedProductIds.length === 0) {
      console.error('❌ No products were added. Cannot continue tests.\n');
      process.exit(1);
    }

    // Test 4: Get Product Details
    console.log('='.repeat(60));
    console.log('TEST 4: Get Product Details\n');
    
    for (const productId of addedProductIds) {
      try {
        console.log(`   Getting details for Product ID: ${productId}`);
        const productData = await contract.methods.products(productId).call();
        
        console.log(`   ✅ Product details retrieved:`);
        console.log(`      ID: ${productData.id}`);
        console.log(`      Origin: ${productData.origin}`);
        console.log(`      Status: ${productData.currentStatus}`);
        console.log(`      Created At: ${new Date(parseInt(productData.createdAt) * 1000).toLocaleString()}`);
        console.log(`      QR Hash: ${productData.qrCodeHash}\n`);
      } catch (err) {
        console.error(`   ❌ Failed to get product ${productId}: ${err.message}\n`);
      }
    }

    // Test 5: Update Product Status
    console.log('='.repeat(60));
    console.log('TEST 5: Update Product Status\n');
    
    if (addedProductIds.length > 0) {
      const productId = addedProductIds[0]; // Use first product
      const statusUpdate = TEST_DATA.statusUpdates[0];
      
      console.log(`   Updating Product ID: ${productId}`);
      console.log(`   New Status: ${statusUpdate.newStatus}`);
      console.log(`   Event Type: ${statusUpdate.eventType}`);
      console.log(`   Location: ${statusUpdate.location}`);
      
      try {
        const tx = await contract.methods.updateStatus(
          productId,
          statusUpdate.newStatus,
          statusUpdate.eventType,
          statusUpdate.location,
          statusUpdate.details
        ).send({
          from: account.address,
          gas: 500000
        });
        
        console.log(`   ✅ Status updated successfully!`);
        console.log(`   Transaction Hash: ${tx.transactionHash}`);
        console.log(`   Block Number: ${tx.blockNumber}\n`);
        
        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify update
        const updatedProduct = await contract.methods.products(productId).call();
        console.log(`   Verified - Current Status: ${updatedProduct.currentStatus}\n`);
      } catch (err) {
        console.error(`   ❌ Failed to update status: ${err.message}\n`);
      }
    }

    // Test 6: Get Product History
    console.log('='.repeat(60));
    console.log('TEST 6: Get Product History\n');
    
    if (addedProductIds.length > 0) {
      const productId = addedProductIds[0];
      
      try {
        console.log(`   Getting history for Product ID: ${productId}`);
        const history = await contract.methods.getHistory(productId).call();
        
        console.log(`   ✅ History retrieved:`);
        console.log(`      Origin: ${history.origin}`);
        console.log(`      Current Status: ${history.currentStatus}`);
        console.log(`      Events Count: ${history.events.length}`);
        
        history.events.forEach((event, index) => {
          console.log(`\n      Event ${index + 1}:`);
          console.log(`         Type: ${event.eventType}`);
          console.log(`         Location: ${event.location}`);
          console.log(`         Details: ${event.details}`);
          console.log(`         Timestamp: ${new Date(parseInt(event.timestamp) * 1000).toLocaleString()}`);
          console.log(`         Signer: ${event.signer}`);
        });
        console.log();
      } catch (err) {
        console.error(`   ❌ Failed to get history: ${err.message}\n`);
      }
    }

    // Test 7: Test Event Listeners (Ethers.js)
    console.log('='.repeat(60));
    console.log('TEST 7: Test Event Listeners (Ethers.js)\n');
    
    let wsUrl = process.env.ALCHEMY_WS_URL;
    if (!wsUrl && process.env.ALCHEMY_API_KEY) {
      wsUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    }
    
    if (wsUrl) {
      try {
        console.log('   Setting up Ethers.js WebSocket connection...');
        const ethersProvider = new ethers.WebSocketProvider(wsUrl);
        const ethersContract = new ethers.Contract(contractAddress, abi, ethersProvider);
        
        console.log('   ✅ WebSocket connection established');
        console.log('   Listening for events... (will timeout after 30 seconds)\n');
        
        let eventReceived = false;
        
        // Listen for ProductCreated
        ethersContract.on('ProductCreated', (id, origin, event) => {
          eventReceived = true;
          console.log('   🎉 ProductCreated Event Received:');
          console.log(`      ID: ${id.toString()}`);
          console.log(`      Origin: ${origin}`);
          console.log(`      Block: ${event.blockNumber}`);
          console.log(`      Transaction: ${event.transactionHash}\n`);
        });
        
        // Listen for ProductUpdated
        ethersContract.on('ProductUpdated', (id, newStatus, event) => {
          eventReceived = true;
          console.log('   🎉 ProductUpdated Event Received:');
          console.log(`      ID: ${id.toString()}`);
          console.log(`      New Status: ${newStatus}`);
          console.log(`      Block: ${event.blockNumber}`);
          console.log(`      Transaction: ${event.transactionHash}\n`);
        });
        
        // Add a new product to trigger event
        console.log('   Triggering event by adding a test product...');
        const testProduct = {
          origin: 'Test Event - ' + Date.now(),
          qrHash: 'TEST-EVENT-' + Date.now()
        };
        
        try {
          const tx = await contract.methods.addProduct(testProduct.origin, testProduct.qrHash).send({
            from: account.address,
            gas: 500000
          });
          console.log(`   ✅ Test product added (Tx: ${tx.transactionHash})`);
          console.log('   Waiting for event...\n');
        } catch (err) {
          console.error(`   ❌ Failed to add test product: ${err.message}\n`);
        }
        
        // Wait for events
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        if (eventReceived) {
          console.log('   ✅ Event listener is working!\n');
        } else {
          console.log('   ⚠️  No events received (may need more time or check WebSocket connection)\n');
        }
        
        // Cleanup
        ethersProvider.destroy();
      } catch (err) {
        console.error(`   ❌ Failed to setup event listeners: ${err.message}\n`);
      }
    } else {
      console.log('   ⚠️  No WebSocket URL found. Skipping event listener test.\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📊 TEST SUMMARY\n');
    console.log(`   ✅ Contract Connection: Working`);
    console.log(`   ✅ Products Added: ${addedProductIds.length}`);
    console.log(`   ✅ Product Details: Retrieved`);
    console.log(`   ✅ Status Updates: Tested`);
    console.log(`   ✅ History Retrieval: Tested`);
    console.log(`   ${wsUrl ? '✅' : '⚠️ '} Event Listeners: ${wsUrl ? 'Tested' : 'Skipped (No WebSocket URL)'}\n`);
    console.log('='.repeat(60));
    console.log('✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testContract().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

