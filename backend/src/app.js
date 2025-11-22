require('dotenv').config();
const express = require('express');
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Product = require('./models/productModel');
const aiService = require('./services/aiService');
const { authenticate, authorize } = require('./middleware/authMiddleware');
const authRoutes = require('./routes/authRoutes');
const app = express();
const port = 3000;

// Helper function để convert BigInt thành string (Web3 v4 trả về BigInt)
function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Nếu là BigInt, convert thành string
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Nếu là array, map qua từng phần tử
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item));
  }
  
  // Nếu là object, convert tất cả properties
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertBigIntToString(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Kết nối Web3 với testnet (dùng cho các operations thông thường)
let rpcUrl = process.env.ALCHEMY_RPC_URL;
let wsUrl = process.env.ALCHEMY_WS_URL;

if (!rpcUrl && process.env.ALCHEMY_API_KEY) {
  // Nếu chỉ có API key, tự động tạo RPC URL
  rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  // Tạo WebSocket URL cho event listeners (Ethers.js)
  wsUrl = `wss://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
}

// Nếu không có RPC URL, sử dụng local provider hoặc throw error
if (!rpcUrl) {
  console.warn('Warning: No ALCHEMY_RPC_URL or ALCHEMY_API_KEY found. Using local provider.');
  rpcUrl = 'http://localhost:8545'; // Local Hardhat node
  wsUrl = 'ws://localhost:8545'; // Local Hardhat WebSocket
}

// Tạo Web3 instance với HTTP provider cho các operations thông thường
const web3 = new Web3(rpcUrl);

// Tạo Ethers.js WebSocketProvider cho event listeners
let ethersProvider = null;
let ethersContract = null;

if (wsUrl) {
  try {
    ethersProvider = new ethers.WebSocketProvider(wsUrl);
    console.log('✅ Ethers.js WebSocketProvider initialized for event listeners');
    
    // Test connection
    ethersProvider.getNetwork().then(network => {
      console.log(`   Connected to network: ${network.name} (chainId: ${network.chainId})`);
    }).catch(err => {
      console.warn('   Could not get network info:', err.message);
    });
  } catch (err) {
    console.warn('⚠️  Could not initialize Ethers.js WebSocketProvider:', err.message);
    console.warn('   Event listeners will not work');
  }
} else {
  console.warn('⚠️  No WebSocket URL found. Event listeners will not work.');
}
const contractAddress = process.env.CONTRACT_ADDRESS;

// Load ABI từ file JSON
const contractArtifactPath = path.join(__dirname, '../../contract/artifacts/contracts/TrueSource.sol/TrueSource.json');
let abi = [];
try {
  const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
  abi = contractArtifact.abi;
} catch (err) {
  console.error('Error loading ABI:', err.message);
  console.log('Make sure contract is compiled and ABI file exists');
}

let contract = null; // Web3 contract cho các operations
let account = null;

if (contractAddress && abi.length > 0) {
  contract = new web3.eth.Contract(abi, contractAddress);
  
  // Tạo Ethers.js contract instance với WebSocket provider cho event listeners
  if (ethersProvider) {
    try {
      ethersContract = new ethers.Contract(contractAddress, abi, ethersProvider);
      console.log('✅ Ethers.js contract instance created for event listeners');
    } catch (err) {
      console.warn('⚠️  Could not create Ethers.js contract instance:', err.message);
    }
  }
} else {
  console.warn('Warning: Contract not initialized. Some features may not work.');
}

// Lấy account từ private key (nếu có)
if (process.env.PRIVATE_KEY) {
  try {
    account = web3.eth.accounts.privateKeyToAccount('0x' + process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
  } catch (err) {
    console.error('Error setting up account:', err.message);
  }
} else {
  console.warn('Warning: PRIVATE_KEY not found. Contract write operations will not work.');
}

app.use(express.json());  // Parse JSON body

// Auth routes (public)
app.use('/auth', authRoutes);

// Protected auth route
app.get('/auth/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      walletAddress: req.user.walletAddress
    }
  });
});

// Protected routes - Add Product (chỉ PRODUCER mới được thêm product)
app.post('/products', authenticate, authorize('producer', 'admin'), async (req, res) => {
  try {
    if (!contract || !account) {
      return res.status(503).json({ error: 'Blockchain service not configured. Please check CONTRACT_ADDRESS and PRIVATE_KEY in .env' });
    }

    const { origin, qrHash } = req.body;
    
    if (!origin || !qrHash) {
      return res.status(400).json({ error: 'origin and qrHash are required' });
    }

    // Gọi contract để thêm product
    const tx = await contract.methods.addProduct(origin, qrHash).send({
      from: account.address,
      gas: 500000
    });

    // Lấy product ID từ event hoặc từ contract
    const productId = await contract.methods.productCounter().call();
    
    // Lấy thông tin product từ contract
    const productData = await contract.methods.products(productId).call();
    
    // Lưu vào MongoDB
    const product = await Product.create({
      id: parseInt(productId),
      origin: productData.origin,
      createdAt: parseInt(productData.createdAt),
      currentStatus: productData.currentStatus,
      qrCodeHash: productData.qrCodeHash,
      events: []
    });

    res.json({
      success: true,
      txHash: tx.transactionHash,
      product: product
    });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route: Get history from contract (public - ai cũng có thể xem)
app.get('/history/:id', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain service not configured' });
    }
    const history = await contract.methods.getHistory(req.params.id).call();
    
    // Convert BigInt to string để có thể serialize thành JSON
    const convertedHistory = convertBigIntToString(history);
    
    res.json(convertedHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route: Get product from MongoDB (public - ai cũng có thể xem)
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lắng nghe events từ contract sử dụng Ethers.js
function setupEventListeners() {
  if (!ethersContract) {
    console.warn('Cannot setup event listeners: Ethers.js contract not initialized');
    console.warn('Make sure ALCHEMY_WS_URL or ALCHEMY_API_KEY is set in .env');
    return;
  }

  try {
    // Lắng nghe event ProductCreated với Ethers.js
    console.log('Setting up ProductCreated event listener...');
    
    ethersContract.on('ProductCreated', async (id, origin, event) => {
      console.log('🎉 ProductCreated Event received:');
      console.log('   ID:', id.toString());
      console.log('   Origin:', origin);
      console.log('   Block:', event.blockNumber);
      console.log('   Transaction:', event.transactionHash);
      
      try {
        // Lấy thông tin product từ contract (dùng Web3 contract)
        const productId = id.toString();
        const productData = await contract.methods.products(productId).call();
        
        // Kiểm tra xem product đã tồn tại trong MongoDB chưa
        let product = await Product.findOne({ id: parseInt(productId) });
        
        if (!product) {
          // Tạo mới nếu chưa có
          product = await Product.create({
            id: parseInt(productId),
            origin: productData.origin,
            createdAt: parseInt(productData.createdAt),
            currentStatus: productData.currentStatus,
            qrCodeHash: productData.qrCodeHash,
            events: []
          });
          console.log('✅ Product synced to MongoDB:', product.id);
        } else {
          console.log('ℹ️  Product already exists in MongoDB:', product.id);
        }
      } catch (err) {
        console.error('❌ Error syncing ProductCreated event:', err);
      }
    });
    
    console.log('✅ ProductCreated event listener setup successfully');
    
  } catch (err) {
    console.error('❌ Error setting up ProductCreated listener:', err);
    console.error('Event listener setup failed. Server will continue but events will not be synced.');
  }

  try {
    // Lắng nghe event ProductUpdated với Ethers.js
    console.log('Setting up ProductUpdated event listener...');
    
    ethersContract.on('ProductUpdated', async (id, newStatus, event) => {
      console.log('🎉 ProductUpdated Event received:');
      console.log('   ID:', id.toString());
      console.log('   New Status:', newStatus);
      console.log('   Block:', event.blockNumber);
      console.log('   Transaction:', event.transactionHash);
      
      try {
        // Lấy thông tin mới nhất từ contract (dùng Web3 contract)
        const productId = id.toString();
        const history = await contract.methods.getHistory(productId).call();
        
        // Cập nhật MongoDB
        const product = await Product.findOne({ id: parseInt(productId) });
        if (product) {
          // Cập nhật status
          product.currentStatus = newStatus;
          
          // Cập nhật events (convert từ contract format)
          product.events = history.events.map(event => ({
            eventType: event.eventType,
            timestamp: parseInt(event.timestamp),
            location: event.location,
            details: event.details,
            signer: event.signer
          }));
          
          await product.save();
          console.log('✅ Product updated in MongoDB:', product.id);
          
          // Trigger AI analysis
          try {
            const aiResult = await aiService.analyzeProduct(product);
            // Lưu AI result vào MongoDB
            if (!product.aiResults) {
              product.aiResults = {};
            }
            product.aiResults[Date.now().toString()] = aiResult;
            await product.save();
            
            // TODO: Có thể lưu AI result lên contract nếu cần
            // await aiService.updateProductWithAIResult(product.id, aiResult);
            
            console.log('✅ AI analysis completed for product:', product.id);
          } catch (aiError) {
            console.error('❌ Error in AI analysis:', aiError);
            // Không throw error để không làm gián đoạn quá trình sync
          }
        } else {
          console.warn('⚠️  Product not found in MongoDB for ID:', productId);
        }
      } catch (err) {
        console.error('❌ Error syncing ProductUpdated event:', err);
      }
    });
    
    console.log('✅ ProductUpdated event listener setup successfully');
    
  } catch (err) {
    console.error('❌ Error setting up ProductUpdated listener:', err);
    console.error('Event listener setup failed. Server will continue but events will not be synced.');
  }
  
  // Xử lý lỗi connection
  if (ethersProvider) {
    ethersProvider.on('error', (error) => {
      console.error('❌ Ethers.js provider error:', error);
    });
  }
  
  console.log('✅ All event listeners setup completed');
}

// Export app để có thể test
module.exports = app;

// Chỉ setup event listeners và start server nếu không phải test environment
if (process.env.NODE_ENV !== 'test') {
  // Khởi động event listeners
  setupEventListeners();
  
  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
    console.log(`RPC URL: ${rpcUrl}`);
    if (contractAddress) {
      console.log(`Contract address: ${contractAddress}`);
    } else {
      console.log('Contract address: Not configured');
    }
    if (account) {
      console.log(`Account: ${account.address}`);
    } else {
      console.log('Account: Not configured');
    }
  });
}