const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  eventType: String,
  timestamp: Number,
  location: String,
  details: String,
  signer: String,
  txHash: String,  // Transaction hash của giao dịch này
  blockNumber: Number  // Block number của giao dịch này
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  origin: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  createdAt: {
    type: Number,
    required: true
  },
  currentStatus: {
    type: String,
    default: "Created"
  },
  events: {
    type: [EventSchema],
    default: []
  },
  qrCodeHash: {
    type: String,
    required: true
  },
  aiResults: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  producerAddress: {
    type: String,
    required: true,
    index: true // Index để query nhanh theo producer
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

module.exports = mongoose.model('Product', ProductSchema);

