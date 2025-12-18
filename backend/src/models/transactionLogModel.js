const mongoose = require('mongoose');

const TransactionLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['product_created', 'product_updated', 'status_changed', 'role_granted', 'role_revoked', 'ai_analysis'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  productId: {
    type: Number,
    default: null
  },
  txHash: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
TransactionLogSchema.index({ type: 1, createdAt: -1 });
TransactionLogSchema.index({ userId: 1, createdAt: -1 });
TransactionLogSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('TransactionLog', TransactionLogSchema);


