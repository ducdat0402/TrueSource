const User = require('../models/userModel');
const Product = require('../models/productModel');
const TransactionLog = require('../models/transactionLogModel');
const rabbitmqService = require('../services/rabbitmqService');

/**
 * GET /admin/users
 * List all users with pagination and search
 */
async function listUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/users/:userId/grant-role
 * Grant role to user (sync với contract)
 */
async function grantRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const previousRole = user.role;
    
    // Update user role in MongoDB
    user.role = role;
    await user.save();

    // Sync với contract _grantRole nếu có walletAddress
    let txHash = null;
    if (user.walletAddress) {
      try {
        const app = require('../app');
        const contract = app.contract;
        const account = app.account;

        if (contract && account) {
          // Get role hash from contract
          let roleHash;
          if (role === 'producer') {
            roleHash = await contract.methods.PRODUCER_ROLE().call();
          } else if (role === 'admin') {
            roleHash = await contract.methods.DEFAULT_ADMIN_ROLE().call();
          } else {
            // Consumer role không có trong contract
            roleHash = null;
          }

          if (roleHash) {
            // Grant role on contract
            const tx = await contract.methods.grantRole(roleHash, user.walletAddress).send({
              from: account.address,
              gas: 200000
            });
            txHash = tx.transactionHash;
            console.log(`✅ Role ${role} granted on contract for ${user.walletAddress}`);
            
            // Publish to RabbitMQ
            await rabbitmqService.publishEvent('user.role.granted', {
              userId: user._id.toString(),
              walletAddress: user.walletAddress,
              role: role,
              txHash: txHash
            });
          }
        }
      } catch (error) {
        console.error('❌ Error syncing role to contract:', error);
        // Continue even if contract sync fails
      }
    }

    // Log transaction
    await TransactionLog.create({
      type: 'role_granted',
      userId: user._id,
      txHash: txHash,
      details: { role, previousRole }
    });

    res.json({
      success: true,
      message: `Role ${role} granted to user`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error granting role:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/users/:userId/revoke-role
 * Revoke role from user
 */
async function revokeRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const previousRole = user.role;
    
    // Set to consumer (default role)
    user.role = 'consumer';
    await user.save();

    // Sync với contract _revokeRole
    let txHash = null;
    if (user.walletAddress) {
      try {
        const app = require('../app');
        const contract = app.contract;
        const account = app.account;

        if (contract && account) {
          // Get role hash based on previous role
          let roleHash;
          if (previousRole === 'producer') {
            roleHash = await contract.methods.PRODUCER_ROLE().call();
          } else if (previousRole === 'admin') {
            roleHash = await contract.methods.DEFAULT_ADMIN_ROLE().call();
          }

          if (roleHash) {
            // Revoke role on contract
            const tx = await contract.methods.revokeRole(roleHash, user.walletAddress).send({
              from: account.address,
              gas: 200000
            });
            txHash = tx.transactionHash;
            console.log(`Role ${previousRole} revoked on contract for ${user.walletAddress}`);
          }
        }
      } catch (error) {
        console.error('Error syncing role revocation to contract:', error);
        // Continue even if contract sync fails
      }
    }

    // Log transaction
    await TransactionLog.create({
      type: 'role_revoked',
      userId: user._id,
      txHash: txHash,
      details: { previousRole }
    });

    res.json({
      success: true,
      message: 'Role revoked from user',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error revoking role:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/products
 * List all products with pagination and filters
 */
async function listProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const query = {};
    if (status) {
      query.currentStatus = status;
    }
    if (search) {
      query.$or = [
        { origin: { $regex: search, $options: 'i' } },
        { qrCodeHash: { $regex: search, $options: 'i' } }
      ];
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
    console.error('Error listing products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/products/:id/approve
 * Approve/update product manually
 */
async function approveProduct(req, res) {
  try {
    const { id } = req.params;
    const { newStatus, eventType, location, details } = req.body;

    const app = require('../app');
    const contract = app.contract;
    const account = app.account;

    if (!contract || !account) {
      return res.status(503).json({ error: 'Blockchain service not configured' });
    }

    // Update on contract
    const tx = await contract.methods.updateStatus(
      id,
      newStatus || 'Approved',
      eventType || 'AdminApproval',
      location || 'Admin Office',
      details || 'Product approved by admin'
    ).send({
      from: account.address,
      gas: 500000
    });

    // Update MongoDB
    const product = await Product.findOne({ id: parseInt(id) });
    if (product) {
      product.currentStatus = newStatus || 'Approved';
      await product.save();
    }

    // Log transaction
    await TransactionLog.create({
      type: 'product_updated',
      productId: parseInt(id),
      txHash: tx.transactionHash,
      details: { newStatus, eventType, location, details }
    });

    res.json({
      success: true,
      message: 'Product approved successfully',
      txHash: tx.transactionHash,
      product
    });
  } catch (error) {
    console.error('Error approving product:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/products/:id/soft-delete
 * Soft delete product (mark inactive in MongoDB)
 */
async function softDeleteProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ id: parseInt(id) });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Mark as inactive (không xóa on-chain để giữ bất biến)
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product marked as inactive',
      product
    });
  } catch (error) {
    console.error('Error soft deleting product:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/products/bulk-update
 * Bulk update products
 */
async function bulkUpdateProducts(req, res) {
  try {
    const { productIds, updateData } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    const result = await Product.updateMany(
      { id: { $in: productIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} products updated`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/analyze-product/:id
 * Manually trigger AI analysis for a product
 */
async function triggerAIAnalysis(req, res) {
  try {
    const { id } = req.params;
    const aiService = require('../services/aiService');

    const product = await Product.findOne({ id: parseInt(id) });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Trigger AI analysis
    const aiResult = await aiService.analyzeProduct(product);

    // Save to MongoDB
    if (!product.aiResults) {
      product.aiResults = {};
    }
    product.aiResults[Date.now().toString()] = aiResult;
    await product.save();

    // TODO: Save to contract if needed
    // const app = require('../app');
    // const contract = app.contract;
    // await contract.methods.updateAiResult(product.id, analysisKey, JSON.stringify(aiResult)).send({...});

    // Log transaction
    await TransactionLog.create({
      type: 'ai_analysis',
      productId: parseInt(id),
      details: { aiResult }
    });

    // Emit Socket.io event
    const io = require('../app').io;
    if (io) {
      io.emit('ai-analysis-triggered', {
        productId: parseInt(id),
        aiResult: aiResult
      });
    }
    
    // Publish to RabbitMQ
    await rabbitmqService.publishEvent('ai.analysis.triggered', {
      productId: parseInt(id),
      aiResult: aiResult
    });

    res.json({
      success: true,
      message: 'AI analysis completed',
      aiResult,
      product
    });
  } catch (error) {
    console.error('Error triggering AI analysis:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/anomalies
 * Get products with anomalies detected
 */
async function getAnomalies(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const severity = req.query.severity; // 'high', 'medium', 'low'
    const skip = (page - 1) * limit;

    const matchQuery = {
      aiResults: { $exists: true, $ne: {} }
    };

    const products = await Product.find(matchQuery)
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter products with anomalies
    const productsWithAnomalies = products
      .map(product => {
        const aiResults = product.aiResults || {};
        const latestAI = Object.values(aiResults)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
        
        if (!latestAI || !latestAI.anomalies || latestAI.anomalies.length === 0) {
          return null;
        }

        // Filter by severity if specified
        if (severity && latestAI.severity !== severity) {
          return null;
        }

        return {
          id: product.id,
          productName: product.productName,
          origin: product.origin,
          currentStatus: product.currentStatus,
          anomalyScore: latestAI.anomalyScore,
          severity: latestAI.severity,
          authenticity: latestAI.authenticity,
          anomalyCount: latestAI.anomalies.length,
          anomalies: latestAI.anomalies.slice(0, 3), // Show first 3
          timestamp: latestAI.timestamp
        };
      })
      .filter(p => p !== null)
      .sort((a, b) => (b.anomalyScore || 0) - (a.anomalyScore || 0));

    const total = productsWithAnomalies.length;

    res.json({
      success: true,
      anomalies: productsWithAnomalies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting anomalies:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/ai-results
 * View AI logs and results
 */
async function getAIResults(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Get products with AI results
    const products = await Product.find({
      aiResults: { $exists: true, $ne: {} }
    })
      .select('id origin currentStatus aiResults')
      .sort({ id: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // Format AI results
    const aiResults = products.map(product => {
      const latestAIResult = Object.values(product.aiResults || {})
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
      
      return {
        productId: product.id,
        origin: product.origin,
        status: product.currentStatus,
        aiResult: latestAIResult,
        riskLevel: latestAIResult?.authenticity === 'Suspicious' ? 'high' : 'low',
        confidence: latestAIResult?.confidence || 0
      };
    });

    const total = await Product.countDocuments({
      aiResults: { $exists: true, $ne: {} }
    });

    res.json({
      success: true,
      aiResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting AI results:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/logs
 * View system logs/events
 */
async function getLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type || '';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const userId = req.query.userId;

    const query = {};
    if (type) {
      query.type = type;
    }
    if (userId) {
      query.userId = userId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const logs = await TransactionLog.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await TransactionLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/analytics
 * Get system analytics and metrics
 */
async function getAnalytics(req, res) {
  try {
    // Count products by status
    const productsByStatus = await Product.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Count users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Total counts
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalTransactions = await TransactionLog.countDocuments();

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentProducts = await Product.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // AI analysis stats
    const productsWithAI = await Product.countDocuments({
      aiResults: { $exists: true, $ne: {} }
    });

    res.json({
      success: true,
      analytics: {
        products: {
          total: totalProducts,
          byStatus: productsByStatus,
          recent: recentProducts,
          withAI: productsWithAI
        },
        users: {
          total: totalUsers,
          byRole: usersByRole,
          recent: recentUsers
        },
        transactions: {
          total: totalTransactions
        }
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /admin/export-products
 * Export products to CSV
 */
async function exportProducts(req, res) {
  try {
    const products = await Product.find().sort({ id: 1 });

    // Convert to CSV format
    const csvHeader = 'ID,Origin,Status,QR Hash,Created At,Events Count\n';
    const csvRows = products.map(p => {
      return `${p.id},"${p.origin}","${p.currentStatus}","${p.qrCodeHash}",${new Date(p.createdAt * 1000).toISOString()},${p.events.length}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /admin/ai/retrain
 * Retrain ML model với dữ liệu mới nhất
 */
async function retrainMLModel(req, res) {
  try {
    const aiService = require('../services/aiService');
    const success = await aiService.retrainMLModel();
    
    if (success) {
      res.json({
        success: true,
        message: 'ML model đã được retrain thành công'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Retrain thất bại hoặc không đủ dữ liệu (cần ít nhất 10 samples)'
      });
    }
  } catch (error) {
    console.error('Error retraining ML model:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listUsers,
  grantRole,
  revokeRole,
  listProducts,
  approveProduct,
  softDeleteProduct,
  bulkUpdateProducts,
  triggerAIAnalysis,
  retrainMLModel,
  getAnomalies,
  getAIResults,
  getLogs,
  getAnalytics,
  exportProducts
};

