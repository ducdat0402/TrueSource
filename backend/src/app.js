require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Product = require('./models/productModel');
const aiService = require('./services/aiService');
const rabbitmqService = require('./services/rabbitmqService');
const { authenticate, authorize, requireVerifiedProducer } = require('./middleware/authMiddleware');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});
const port = 3000;

// Helper function để convert BigInt thành string (Web3 v4 trả về BigInt)
// Export để dùng trong controllers
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

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));  // Enable CORS
// Increase body parser limit to handle base64 file uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public route - Get contract info for frontend
app.get('/contract/info', (req, res) => {
  try {
    if (!contractAddress || !abi || abi.length === 0) {
      return res.status(503).json({ 
        error: 'Contract not configured',
        contractAddress: null,
        abi: null
      });
    }

    res.json({
      success: true,
      contractAddress: contractAddress,
      abi: abi
    });
  } catch (error) {
    console.error('Error getting contract info:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      walletAddress: req.user.walletAddress,
      verificationStatus: req.user.verificationStatus || 'unverified'
    }
  });
});

// Admin routes (protected, admin only)
app.use('/admin', adminRoutes);

// User routes (some public, some protected)
app.use('/user', userRoutes);

// Protected routes - Add Product (chỉ PRODUCER đã xác thực mới được thêm product)
app.post('/products', authenticate, authorize('producer', 'admin'), requireVerifiedProducer, async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain service not configured. Please check CONTRACT_ADDRESS in .env' });
    }

    // Producer phải có wallet address
    if (req.user.role === 'producer' && !req.user.walletAddress) {
      return res.status(400).json({ error: 'Producer must have a wallet address. Please update your profile.' });
    }

    const { origin, productName, category, qrHash, txHash } = req.body;
    
    if (!origin || !productName || !category || !qrHash) {
      return res.status(400).json({ error: 'origin, productName, category, and qrHash are required' });
    }

    // Producer address để lưu vào product
    const producerAddress = req.user.walletAddress || (req.user.role === 'admin' ? account?.address : null);
    
    if (!producerAddress) {
      return res.status(400).json({ error: 'Producer wallet address is required' });
    }

    let tx;
    let productId;

    // Producer PHẢI gửi transaction từ MetaMask (frontend đã gửi transaction trực tiếp)
    if (req.user.role === 'producer') {
      if (!txHash) {
        return res.status(400).json({ 
          error: 'Producer must send transaction from MetaMask. Transaction hash is required.' 
        });
      }

      try {
        // Lấy transaction receipt từ blockchain
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        if (!receipt) {
          return res.status(400).json({ error: 'Transaction not found. Please wait for transaction to be mined.' });
        }

        // Lấy product ID từ event ProductCreated hoặc từ contract counter
        // Thử lấy từ event trước
        const logs = receipt.logs;
        let productIdFromEvent = null;
        
        // Decode event logs để tìm ProductCreated event
        try {
          const eventSignature = web3.utils.keccak256('ProductCreated(uint256,string)');
          for (const log of logs) {
            if (log.topics && log.topics[0] === eventSignature) {
              // Decode event data
              productIdFromEvent = parseInt(web3.utils.hexToNumberString(log.topics[1]));
              break;
            }
          }
        } catch (eventErr) {
          console.warn('Could not decode event:', eventErr.message);
        }

        // Nếu không tìm thấy từ event, dùng productCounter
        if (productIdFromEvent) {
          productId = productIdFromEvent;
        } else {
          productId = await contract.methods.productCounter().call();
          productId = typeof productId === 'bigint' ? Number(productId) : parseInt(productId);
        }
        
        // Tạo tx object từ receipt
        tx = {
          transactionHash: txHash,
          blockNumber: receipt.blockNumber
        };
      } catch (err) {
        console.error('Error getting transaction receipt:', err);
        return res.status(400).json({ error: 'Invalid transaction hash: ' + err.message });
      }
    } else if (req.user.role === 'admin') {
      // Admin có thể dùng service account
      if (!account) {
        return res.status(503).json({ 
          error: 'Please configure service account for admin operations' 
        });
      }

      tx = await contract.methods.addProduct(origin, productName, category, qrHash).send({
        from: account.address,
        gas: 500000
      });

      productId = await contract.methods.productCounter().call();
    }
    
    // Lấy thông tin product từ contract (convert BigInt)
    const productDataRaw = await contract.methods.products(productId).call();
    const productData = convertBigIntToString(productDataRaw);
    
    // Lấy block number từ transaction
    let blockNumber = null;
    try {
      if (tx.blockNumber) {
        blockNumber = typeof tx.blockNumber === 'bigint' ? Number(tx.blockNumber) : parseInt(tx.blockNumber);
      } else {
        const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
        blockNumber = receipt ? parseInt(receipt.blockNumber) : null;
      }
    } catch (err) {
      console.warn('Could not get block number:', err.message);
    }
    
    // Lưu vào MongoDB với producerAddress
    const product = await Product.create({
      id: typeof productId === 'bigint' ? Number(productId) : parseInt(productId),
      origin: productData.origin,
      productName: productData.productName || productName, // Fallback nếu contract chưa có
      category: productData.category || category, // Fallback nếu contract chưa có
      createdAt: typeof productData.createdAt === 'bigint' ? Number(productData.createdAt) : parseInt(productData.createdAt),
      currentStatus: productData.currentStatus,
      qrCodeHash: productData.qrCodeHash,
      producerAddress: producerAddress.toLowerCase(), // Normalize address
      txHash: tx.transactionHash,
      blockNumber: blockNumber,
      events: [],
      isActive: true
    });

    // Log transaction
    const TransactionLog = require('./models/transactionLogModel');
    await TransactionLog.create({
      type: 'product_created',
      userId: req.user._id,
      productId: typeof productId === 'bigint' ? Number(productId) : parseInt(productId),
      txHash: tx.transactionHash,
      producerAddress: producerAddress,
      details: { 
        origin: productData.origin, 
        productName: productData.productName || productName, 
        category: productData.category || category, 
        qrHash: productData.qrCodeHash 
      }
    });

    res.json({
      success: true,
      txHash: tx.transactionHash,
      product: product,
      producerAddress: producerAddress
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

// Route: Get all products (public)
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ id: -1 });
    res.json(products);
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
          
          // Emit Socket.io event
          if (global.io) {
            global.io.emit('product-created', {
              productId: product.id,
              origin: product.origin,
              status: product.currentStatus
            });
          }
          
          // Publish to RabbitMQ
          await rabbitmqService.publishEvent('product.created', {
            productId: product.id,
            origin: product.origin,
            status: product.currentStatus
          });
          
          // Publish to RabbitMQ
          await rabbitmqService.publishEvent('product.created', {
            productId: product.id,
            origin: product.origin,
            status: product.currentStatus
          });
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
          
          // Lấy txHash và blockNumber từ event object
          const eventTxHash = event.transactionHash;
          const eventBlockNumber = event.blockNumber ? parseInt(event.blockNumber) : null;
          
          // Tạo map để giữ txHash của events cũ (nếu có)
          const existingEventsMap = new Map();
          product.events.forEach((evt, idx) => {
            if (evt.txHash) {
              // Key: eventType + timestamp + location để match
              const key = `${evt.eventType}-${evt.timestamp}-${evt.location}`;
              existingEventsMap.set(key, { txHash: evt.txHash, blockNumber: evt.blockNumber });
            }
          });
          
          // Cập nhật events (convert từ contract format)
          product.events = history.events.map((event, idx) => {
            const key = `${event.eventType}-${parseInt(event.timestamp)}-${event.location}`;
            const existingTx = existingEventsMap.get(key);
            
            // Nếu là event mới nhất (cuối cùng) và chưa có txHash, dùng từ event listener
            const isLatestEvent = idx === history.events.length - 1;
            const txHash = existingTx?.txHash || (isLatestEvent ? eventTxHash : null);
            const blockNumber = existingTx?.blockNumber || (isLatestEvent ? eventBlockNumber : null);
            
            return {
              eventType: event.eventType,
              timestamp: parseInt(event.timestamp),
              location: event.location,
              details: event.details,
              signer: event.signer,
              txHash: txHash,
              blockNumber: blockNumber
            };
          });
          
          await product.save();
          console.log('✅ Product updated in MongoDB:', product.id);
          
          // Emit Socket.io event
          if (global.io) {
            global.io.emit('product-updated', {
              productId: product.id,
              newStatus: newStatus,
              events: product.events
            });
            global.io.to(`product-${product.id}`).emit('product-status-changed', {
              productId: product.id,
              status: newStatus
            });
          }
          
          // Publish to RabbitMQ
          await rabbitmqService.publishEvent('product.updated', {
            productId: product.id,
            newStatus: newStatus,
            events: product.events
          });
          
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
            
            // Emit AI result via Socket.io
            if (global.io) {
              global.io.emit('ai-analysis-completed', {
                productId: product.id,
                aiResult: aiResult
              });
            }
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

// Setup Socket.io for real-time updates
function setupSocketIO() {
  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow connection without token (for public events)
      return next();
    }
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      // Allow connection even if token invalid (for public events)
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);
    
    // Join room based on role
    if (socket.userRole === 'admin') {
      socket.join('admin');
      console.log(`Admin joined: ${socket.id}`);
    } else if (socket.userRole === 'producer') {
      socket.join('producer');
      console.log(`Producer joined: ${socket.id}`);
    }

    // Join product-specific room
    socket.on('subscribe-product', (productId) => {
      socket.join(`product-${productId}`);
      console.log(`Client ${socket.id} subscribed to product ${productId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Make io available globally for emitting events
  global.io = io;
  console.log('✅ Socket.io setup completed');
}

// Export app và các utilities để có thể test và dùng trong controllers
module.exports = app;
module.exports.io = io; // Export Socket.io instance
module.exports.web3 = web3; // Export Web3 instance
module.exports.convertBigIntToString = convertBigIntToString;
module.exports.contract = contract;
module.exports.account = account;

// Chỉ setup event listeners và start server nếu không phải test environment
if (process.env.NODE_ENV !== 'test') {
  // Khởi động event listeners
  setupEventListeners();
  
  // Setup Socket.io
  setupSocketIO();

  server.listen(port, () => {
    console.log(`Backend running on port ${port}`);
    console.log(`Socket.io server initialized`);
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