const Product = require('../models/productModel');
const TransactionLog = require('../models/transactionLogModel');

/**
 * GET /user/trace/:id
 * Trace product by ID or QR hash (public, but logged if user is authenticated)
 */
async function traceProduct(req, res) {
  try {
    const { id } = req.params;
    const app = require('../app');
    const contract = app.contract;
    const convertBigIntToString = app.convertBigIntToString;

    // Decode URL-encoded string
    const decodedId = decodeURIComponent(id);
    
    // Try to parse as number
    const numericId = parseInt(decodedId);
    const isNumeric = !isNaN(numericId) && isFinite(numericId);

    // Build search query - try multiple fields
    const searchConditions = [];
    
    if (isNumeric) {
      searchConditions.push({ id: numericId });
    }
    
    // Always try qrCodeHash (could be PROD-xxx format or any string)
    searchConditions.push({ qrCodeHash: decodedId });
    
    // Try productName if it's not a number and not a QR hash format
    if (!isNumeric && !decodedId.startsWith('PROD-')) {
      searchConditions.push({ productName: { $regex: decodedId, $options: 'i' } });
    }

    // Try to get from MongoDB first (faster)
    let product = await Product.findOne({ 
      $or: searchConditions
    });

    // If not in MongoDB, get from contract (only if we have a numeric ID)
    let history = null;
    if (contract && isNumeric) {
      try {
        const productId = product ? product.id : numericId;
        history = await contract.methods.getHistory(productId).call();
        history = convertBigIntToString(history);
      } catch (err) {
        console.error('Error getting history from contract:', err);
      }
    }

    // If product not found in MongoDB but found in contract, create entry
    if (!product && history && isNumeric) {
      // Try to get producer address from contract events or use default
      let producerAddress = 'Unknown';
      if (history.events && history.events.length > 0) {
        // Get producer from first event signer
        producerAddress = history.events[0].signer || 'Unknown';
      }
      
      product = await Product.create({
        id: numericId,
        origin: history.origin || 'Unknown',
        productName: `Sản phẩm #${numericId}`, // Default product name when creating from contract
        category: 'HÀNG TIÊU DÙNG', // Default category when creating from contract
        createdAt: Date.now() / 1000, // Convert to seconds
        currentStatus: history.currentStatus || 'Created',
        qrCodeHash: decodedId,
        producerAddress: producerAddress.toLowerCase(),
        events: history.events || []
      });
    }

    // Log trace action if user is authenticated
    if (req.user) {
      await TransactionLog.create({
        type: 'product_created', // Reuse type
        userId: req.user._id,
        productId: product?.id,
        details: { action: 'trace' }
      });
    }

    // Get blockchain verification info if product exists
    let blockchainInfo = null;
    if (product && product.txHash) {
      try {
        const app = require('../app');
        const web3 = app.web3;
        if (web3) {
          const receipt = await web3.eth.getTransactionReceipt(product.txHash);
          if (receipt) {
            const block = await web3.eth.getBlock(receipt.blockNumber);
            blockchainInfo = {
              txHash: product.txHash,
              blockNumber: parseInt(receipt.blockNumber),
              blockHash: receipt.blockHash,
              timestamp: block ? parseInt(block.timestamp) : null,
              confirmations: block ? (await web3.eth.getBlockNumber()) - parseInt(receipt.blockNumber) : null
            };
          }
        }
      } catch (err) {
        console.error('Error getting blockchain info:', err);
        // Fallback to basic info
        if (product.txHash) {
          blockchainInfo = {
            txHash: product.txHash,
            blockNumber: product.blockNumber || null
          };
        }
      }
    }

    // If no product found, return appropriate error
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy sản phẩm với mã QR này. Vui lòng kiểm tra lại.',
        product: null,
        history: null,
        blockchainInfo: null
      });
    }

    // Tự động trigger AI analysis nếu chưa có
    if (product && (!product.aiResults || Object.keys(product.aiResults).length === 0)) {
      // Chỉ trigger nếu có ít nhất 2 events
      if (product.events && product.events.length >= 2) {
        try {
          const aiService = require('../services/aiService');
          
          // Thử đợi AI analysis tối đa 3 giây (để user thấy kết quả ngay)
          const aiAnalysisPromise = aiService.analyzeProduct(product);
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
          
          const aiResult = await Promise.race([aiAnalysisPromise, timeoutPromise]);
          
          if (aiResult) {
            // AI analysis hoàn thành trong 3 giây, lưu và trả về ngay
            if (!product.aiResults) {
              product.aiResults = {};
            }
            const analysisKey = Date.now().toString();
            product.aiResults[analysisKey] = aiResult;
            await product.save();
            console.log(`✅ [Auto AI] Đã tự động phân tích sản phẩm #${product.id} (trong thời gian chờ)`);
            
            // Emit Socket.io event
            const app = require('../app');
            if (app.io) {
              app.io.emit('ai-analysis-completed', {
                productId: product.id,
                aiResult: aiResult
              });
            }
          } else {
            // AI analysis chưa xong trong 3 giây, chạy async
            console.log(`⏳ [Auto AI] Đang phân tích sản phẩm #${product.id} (async)...`);
            aiAnalysisPromise.then(async (aiResult) => {
              try {
                if (!product.aiResults) {
                  product.aiResults = {};
                }
                const analysisKey = Date.now().toString();
                product.aiResults[analysisKey] = aiResult;
                await product.save();
                console.log(`✅ [Auto AI] Đã tự động phân tích sản phẩm #${product.id} (async)`);
                
                // Emit Socket.io event để frontend update
                const app = require('../app');
                if (app.io) {
                  app.io.emit('ai-analysis-completed', {
                    productId: product.id,
                    aiResult: aiResult
                  });
                }
              } catch (saveErr) {
                console.error('Error saving AI result:', saveErr);
              }
            }).catch(err => {
              console.error('Error in auto AI analysis:', err);
            });
          }
        } catch (err) {
          console.error('Error triggering AI analysis:', err);
        }
      }
    }

    res.json({
      success: true,
      product: product,
      history: history || null,
      blockchainInfo: blockchainInfo,
      source: product ? 'mongodb' : 'contract'
    });
  } catch (error) {
    console.error('Error tracing product:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Lỗi khi tìm kiếm sản phẩm'
    });
  }
}

/**
 * GET /user/dashboard
 * Get user's personal dashboard
 */
async function getDashboard(req, res) {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get user's products (if producer)
    let userProducts = [];
    if (userRole === 'producer') {
      // TODO: Filter by signer address from contract events
      // For now, get all products (can be improved)
      userProducts = await Product.find()
        .sort({ id: -1 })
        .limit(10);
    }

    // Get user's trace history
    const traceHistory = await TransactionLog.find({
      userId,
      type: 'product_created',
      'details.action': 'trace'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('productId');

    // Get user's activity stats
    const totalTraces = await TransactionLog.countDocuments({
      userId,
      'details.action': 'trace'
    });

    res.json({
      success: true,
      dashboard: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role
        },
        products: userProducts,
        traceHistory,
        stats: {
          totalTraces,
          totalProducts: userRole === 'producer' ? userProducts.length : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /user/products
 * Get user's own products (for producer)
 */
async function getMyProducts(req, res) {
  try {
    if (req.user.role !== 'producer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only producers can view their products' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;

    // Filter by producer address
    const producerAddress = req.user.walletAddress;
    if (!producerAddress && req.user.role === 'producer') {
      return res.status(400).json({ error: 'Producer must have a wallet address' });
    }

    const query = {};
    if (req.user.role === 'producer' && producerAddress) {
      query.producerAddress = producerAddress.toLowerCase();
    }

    const products = await Product.find(query)
      .sort({ id: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting my products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /user/products/:id/update-status
 * Update product status (for producer)
 */
async function updateProductStatus(req, res) {
  try {
    if (req.user.role !== 'producer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only producers can update product status' });
    }

    const { id } = req.params;
    const { newStatus, eventType, location, details } = req.body;

    if (!newStatus || !eventType || !location || !details) {
      return res.status(400).json({ 
        error: 'newStatus, eventType, location, and details are required' 
      });
    }

    const app = require('../app');
    const contract = app.contract;
    const account = app.account;

    if (!contract || !account) {
      return res.status(503).json({ error: 'Blockchain service not configured' });
    }

    // Producer phải có wallet address
    const producerAddress = req.user.walletAddress;
    if (req.user.role === 'producer' && !producerAddress) {
      return res.status(400).json({ error: 'Producer must have a wallet address to update products' });
    }

    // Verify product belongs to this producer (nếu là producer, không phải admin)
    if (req.user.role === 'producer') {
      const product = await Product.findOne({ id: parseInt(id) });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (product.producerAddress?.toLowerCase() !== producerAddress?.toLowerCase()) {
        return res.status(403).json({ error: 'You can only update your own products' });
      }
    }

    const { txHash } = req.body;
    let tx;

    // Producer PHẢI gửi transaction từ MetaMask
    if (req.user.role === 'producer') {
      if (!txHash) {
        return res.status(400).json({ 
          error: 'Producer must send transaction from MetaMask. Transaction hash is required.' 
        });
      }

      try {
        // Lấy transaction receipt từ blockchain
        const web3 = require('../app').web3;
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (!receipt) {
          return res.status(400).json({ error: 'Transaction not found. Please wait for transaction to be mined.' });
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

      // Update on contract
      tx = await contract.methods.updateStatus(
        id,
        newStatus,
        eventType,
        location,
        details
      ).send({
        from: account.address,
        gas: 500000
      });
    }

    // Update MongoDB
    const product = await Product.findOne({ id: parseInt(id) });
    if (product) {
      // Get block number from transaction
      let blockNumber = null;
      if (tx.blockNumber) {
        blockNumber = typeof tx.blockNumber === 'bigint' ? Number(tx.blockNumber) : parseInt(tx.blockNumber);
      } else if (txHash) {
        try {
          const web3 = require('../app').web3;
          const receipt = await web3.eth.getTransactionReceipt(txHash);
          if (receipt) {
            blockNumber = parseInt(receipt.blockNumber);
          }
        } catch (err) {
          console.warn('Could not get block number:', err.message);
        }
      }

      product.currentStatus = newStatus;
      
      // Debug: Log txHash để kiểm tra
      const finalTxHash = tx.transactionHash || txHash;
      console.log('📝 Saving event with txHash:', finalTxHash);
      console.log('📝 Block number:', blockNumber);
      console.log('📝 Transaction object:', { 
        transactionHash: tx.transactionHash, 
        txHash: txHash,
        blockNumber: tx.blockNumber 
      });
      
      product.events.push({
        eventType,
        timestamp: Math.floor(Date.now() / 1000),
        location,
        details,
        signer: producerAddress || account?.address || 'Unknown',
        txHash: finalTxHash,
        blockNumber: blockNumber
      });
      await product.save();
      
      // Debug: Verify saved event
      const savedProduct = await Product.findOne({ id: parseInt(id) });
      const lastEvent = savedProduct.events[savedProduct.events.length - 1];
      console.log('✅ Last event saved:', {
        eventType: lastEvent.eventType,
        txHash: lastEvent.txHash,
        blockNumber: lastEvent.blockNumber
      });
    }

    // Log transaction
    await TransactionLog.create({
      type: 'product_updated',
      userId: req.user._id,
      productId: parseInt(id),
      txHash: tx.transactionHash,
      producerAddress: producerAddress,
      details: { newStatus, eventType, location, details }
    });

    res.json({
      success: true,
      message: 'Product status updated successfully',
      txHash: tx.transactionHash,
      product
    });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /user/search
 * Search products (for consumer, public)
 */
async function searchProducts(req, res) {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const products = await Product.find({
      $or: [
        { origin: { $regex: query, $options: 'i' } },
        { qrCodeHash: { $regex: query, $options: 'i' } },
        { id: isNaN(query) ? null : parseInt(query) }
      ].filter(condition => condition !== null)
    })
      .sort({ id: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments({
      $or: [
        { origin: { $regex: query, $options: 'i' } },
        { qrCodeHash: { $regex: query, $options: 'i' } }
      ]
    });

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /user/products/:id/ai-insights
 * Get AI insights for a product (for consumer, public)
 */
async function getAIInsights(req, res) {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ 
      $or: [
        { id: parseInt(id) },
        { qrCodeHash: id }
      ]
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get latest AI result
    const aiResults = product.aiResults || {};
    const latestAIResult = Object.values(aiResults)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

    if (!latestAIResult) {
      return res.json({
        success: true,
        message: 'No AI analysis available for this product',
        productId: product.id,
        aiResult: null
      });
    }

    res.json({
      success: true,
      productId: product.id,
      origin: product.origin,
      status: product.currentStatus,
      aiInsights: {
        authenticity: latestAIResult.authenticity,
        confidence: latestAIResult.confidence,
        riskLevel: latestAIResult.authenticity === 'Suspicious' ? 'high' : 'low',
        analysis: latestAIResult.analysis,
        timestamp: latestAIResult.timestamp
      }
    });
  } catch (error) {
    console.error('Error getting AI insights:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  traceProduct,
  getDashboard,
  getMyProducts,
  updateProductStatus,
  searchProducts,
  getAIInsights
};

