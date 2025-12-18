const Product = require('../models/productModel');
const User = require('../models/userModel');
const TransactionLog = require('../models/transactionLogModel');

/**
 * GET /admin/analytics/charts
 * Get chart data for analytics dashboard
 */
async function getChartData(req, res) {
  try {
    // Products by Status Chart
    const productsByStatus = await Product.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Users by Role Chart
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Products Created Over Time (Last 30 days)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const productsOverTime = await Product.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $addFields: {
          createdDate: {
            $toDate: { $multiply: ['$createdAt', 1000] }
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdDate'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Transaction Types Distribution
    const transactionTypes = await TransactionLog.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // AI Analysis Results Distribution
    const aiResults = await Product.aggregate([
      {
        $match: {
          aiResults: { $exists: true, $ne: {} }
        }
      },
      {
        $project: {
          latestAI: {
            $arrayElemAt: [
              {
                $objectToArray: '$aiResults'
              },
              -1
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$latestAI.v.authenticity', 'Unknown']
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      charts: {
        productsByStatus: {
          labels: productsByStatus.map(p => p._id),
          data: productsByStatus.map(p => p.count)
        },
        usersByRole: {
          labels: usersByRole.map(u => u._id),
          data: usersByRole.map(u => u.count)
        },
        productsOverTime: {
          labels: productsOverTime.map(p => p._id),
          data: productsOverTime.map(p => p.count)
        },
        transactionTypes: {
          labels: transactionTypes.map(t => t._id),
          data: transactionTypes.map(t => t.count)
        },
        aiResults: {
          labels: aiResults.map(a => a._id || 'Unknown'),
          data: aiResults.map(a => a.count)
        }
      }
    });
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getChartData
};

