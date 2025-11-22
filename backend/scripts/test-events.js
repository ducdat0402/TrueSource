/**
 * Test script để debug event listeners
 * Chạy: node scripts/test-events.js
 */

require('dotenv').config();
const { Web3 } = require('web3');
const path = require('path');
const fs = require('fs');

async function testEvents() {
  try {
    // Kết nối Web3
    let rpcUrl = process.env.ALCHEMY_RPC_URL;
    if (!rpcUrl && process.env.ALCHEMY_API_KEY) {
      rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    }

    if (!rpcUrl) {
      console.error('❌ No RPC URL found. Please set ALCHEMY_RPC_URL or ALCHEMY_API_KEY in .env');
      process.exit(1);
    }

    console.log('🔗 Connecting to:', rpcUrl);
    const web3 = new Web3(rpcUrl);
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      console.error('❌ No CONTRACT_ADDRESS found in .env');
      process.exit(1);
    }

    // Load ABI
    const contractArtifactPath = path.join(__dirname, '../../contract/artifacts/contracts/TrueSource.sol/TrueSource.json');
    let abi = [];
    try {
      const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
      abi = contractArtifact.abi;
      console.log('✅ ABI loaded successfully');
      console.log(`   ABI has ${abi.length} items`);
    } catch (err) {
      console.error('❌ Error loading ABI:', err.message);
      process.exit(1);
    }

    // Tạo contract instance
    let contract;
    try {
      contract = new web3.eth.Contract(abi, contractAddress);
      console.log('✅ Contract instance created');
      console.log(`   Contract address: ${contractAddress}`);
    } catch (err) {
      console.error('❌ Error creating contract:', err.message);
      process.exit(1);
    }

    // Test 1: Kiểm tra contract có events không
    console.log('\n📋 Test 1: Check contract.events');
    console.log('   contract.events type:', typeof contract.events);
    
    if (contract.events) {
      console.log('   ✅ contract.events exists');
      const eventKeys = Object.keys(contract.events);
      console.log('   Available events:', eventKeys);
      
      // Kiểm tra ProductCreated
      if (contract.events.ProductCreated) {
        console.log('   ✅ contract.events.ProductCreated exists');
        console.log('   Type:', typeof contract.events.ProductCreated);
        
        // Thử gọi với các cách khác nhau
        console.log('\n   Testing different ways to call ProductCreated:');
        
        // Cách 1: Không có tham số
        try {
          const eventObj1 = contract.events.ProductCreated();
          console.log('   ✅ contract.events.ProductCreated() works');
          console.log('      Returned type:', typeof eventObj1);
          console.log('      Returned value:', eventObj1);
          console.log('      Has .on:', typeof eventObj1?.on === 'function');
          console.log('      Has .subscribe:', typeof eventObj1?.subscribe === 'function');
          console.log('      Methods:', Object.keys(eventObj1 || {}));
        } catch (e) {
          console.log('   ❌ contract.events.ProductCreated() failed:', e.message);
        }
        
        // Cách 2: Với options rỗng
        try {
          const eventObj2 = contract.events.ProductCreated({});
          console.log('   ✅ contract.events.ProductCreated({}) works');
          console.log('      Returned type:', typeof eventObj2);
          console.log('      Has .on:', typeof eventObj2?.on === 'function');
        } catch (e) {
          console.log('   ❌ contract.events.ProductCreated({}) failed:', e.message);
        }
        
        // Cách 3: Với fromBlock
        try {
          const eventObj3 = contract.events.ProductCreated({ fromBlock: 'latest' });
          console.log('   ✅ contract.events.ProductCreated({ fromBlock: "latest" }) works');
          console.log('      Returned type:', typeof eventObj3);
          console.log('      Has .on:', typeof eventObj3?.on === 'function');
        } catch (e) {
          console.log('   ❌ contract.events.ProductCreated({ fromBlock: "latest" }) failed:', e.message);
        }
      } else {
        console.log('   ❌ contract.events.ProductCreated does not exist');
      }
    } else {
      console.log('   ❌ contract.events does not exist');
    }

    // Test 2: Kiểm tra contract methods
    console.log('\n📋 Test 2: Check contract methods');
    try {
      const productCounter = await contract.methods.productCounter().call();
      console.log('   ✅ contract.methods.productCounter().call() works');
      console.log('   Product counter:', productCounter);
    } catch (err) {
      console.log('   ❌ Error calling contract method:', err.message);
    }

    // Test 3: Thử setup event listener với cách đúng
    console.log('\n📋 Test 3: Try to setup event listener');
    
    // Trong Web3 v4, có thể cần dùng cách khác
    // Thử dùng web3.eth.subscribe hoặc contract.events với cách khác
    
    try {
      // Cách 1: Thử với .on() trực tiếp
      console.log('   Trying method 1: contract.events.ProductCreated().on()');
      try {
        const eventEmitter = contract.events.ProductCreated();
        if (eventEmitter && typeof eventEmitter.on === 'function') {
          eventEmitter.on('data', (event) => {
            console.log('   🎉 Event received:', event);
          });
          eventEmitter.on('error', (error) => {
            console.log('   ❌ Event error:', error);
          });
          console.log('   ✅ Event listeners attached with .on()');
        } else {
          console.log('   ❌ eventEmitter.on is not a function');
        }
      } catch (e) {
        console.log('   ❌ Method 1 failed:', e.message);
      }
      
      // Cách 2: Thử với .subscribe() nếu có
      console.log('   Trying method 2: contract.events.ProductCreated().subscribe()');
      try {
        const eventEmitter = contract.events.ProductCreated();
        if (eventEmitter && typeof eventEmitter.subscribe === 'function') {
          const subscription = eventEmitter.subscribe((event) => {
            console.log('   🎉 Event received via subscribe:', event);
          });
          console.log('   ✅ Subscription created:', subscription);
        } else {
          console.log('   ❌ eventEmitter.subscribe is not a function');
        }
      } catch (e) {
        console.log('   ❌ Method 2 failed:', e.message);
      }
      
      // Cách 3: Thử với web3.eth.subscribe
      console.log('   Trying method 3: web3.eth.subscribe("logs")');
      try {
        // Web3 v4 có thể cần dùng web3.eth.subscribe
        const subscription = await web3.eth.subscribe('logs', {
          address: contractAddress,
          topics: [
            // Event signature: ProductCreated(uint256,string)
            web3.utils.keccak256('ProductCreated(uint256,string)')
          ]
        });
        
        subscription.on('data', (log) => {
          console.log('   🎉 Log received:', log);
        });
        
        subscription.on('error', (error) => {
          console.log('   ❌ Subscription error:', error);
        });
        
        console.log('   ✅ Subscription created with web3.eth.subscribe');
      } catch (e) {
        console.log('   ❌ Method 3 failed:', e.message);
        console.log('   Error details:', e);
      }
      
    } catch (err) {
      console.log('   ❌ Error in Test 3:', err.message);
      console.log('   Stack:', err.stack);
    }

    // Giữ script chạy để test events
    console.log('\n⏳ Waiting for events... (press Ctrl+C to stop)');
    console.log('   Try calling addProduct on the contract to trigger an event');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

testEvents();

// Giữ process chạy
process.on('SIGINT', () => {
  console.log('\n👋 Stopping test...');
  process.exit(0);
});

