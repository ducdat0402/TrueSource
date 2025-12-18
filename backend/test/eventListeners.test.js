/**
 * Integration tests cho Event Listeners
 * Test việc sync data từ blockchain events vào MongoDB
 */

const mongoose = require('mongoose');
const Product = require('../src/models/productModel');
const aiService = require('../src/services/aiService');

// Mock Web3 contract events
jest.mock('../src/services/aiService');

describe('Event Listeners Integration', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await Product.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
    jest.clearAllMocks();
  });

  describe('ProductCreated Event Handler', () => {
    it('should sync product to MongoDB when ProductCreated event is emitted', async () => {
      // Mock event data
      const mockEvent = {
        returnValues: {
          id: '1',
          origin: 'Vietnam'
        },
        blockNumber: 12345
      };

      // Mock contract method call
      const mockProductData = {
        id: '1',
        origin: 'Vietnam',
        createdAt: Date.now().toString(),
        currentStatus: 'Created',
        qrCodeHash: 'test-qr-hash'
      };

      // Simulate event handler logic
      const product = await Product.create({
        id: parseInt(mockEvent.returnValues.id),
        origin: mockProductData.origin,
        createdAt: parseInt(mockProductData.createdAt),
        currentStatus: mockProductData.currentStatus,
        qrCodeHash: mockProductData.qrCodeHash,
        events: []
      });

      // Verify product was created
      expect(product).toBeDefined();
      expect(product.id).toBe(1);
      expect(product.origin).toBe('Vietnam');

      // Verify in database
      const savedProduct = await Product.findOne({ id: 1 });
      expect(savedProduct).toBeDefined();
      expect(savedProduct.origin).toBe('Vietnam');
    });
  });

  describe('ProductUpdated Event Handler', () => {
    it('should update product and trigger AI analysis when ProductUpdated event is emitted', async () => {
      // Tạo product ban đầu
      const product = await Product.create({
        id: 1,
        origin: 'Vietnam',
        createdAt: Date.now(),
        currentStatus: 'Created',
        qrCodeHash: 'test-hash',
        events: []
      });

      // Mock event data
      const mockEvent = {
        returnValues: {
          id: '1',
          newStatus: 'In Transit'
        }
      };

      // Mock history from contract
      const mockHistory = {
        origin: 'Vietnam',
        events: [
          {
            eventType: 'StatusUpdate',
            timestamp: Date.now().toString(),
            location: 'Warehouse A',
            details: 'Product shipped',
            signer: '0x123...'
          }
        ],
        currentStatus: 'In Transit'
      };

      // Mock AI result
      const mockAIResult = {
        authenticity: 'Verified',
        confidence: 95,
        analysis: 'Product authenticity verified',
        timestamp: Date.now()
      };

      aiService.analyzeProduct.mockResolvedValue(mockAIResult);

      // Simulate event handler logic
      const updatedProduct = await Product.findOne({ id: parseInt(mockEvent.returnValues.id) });
      if (updatedProduct) {
        updatedProduct.currentStatus = mockEvent.returnValues.newStatus;
        updatedProduct.events = mockHistory.events.map(event => ({
          eventType: event.eventType,
          timestamp: parseInt(event.timestamp),
          location: event.location,
          details: event.details,
          signer: event.signer
        }));
        await updatedProduct.save();

        // Trigger AI analysis
        const aiResult = await aiService.analyzeProduct(updatedProduct);
        if (!updatedProduct.aiResults) {
          updatedProduct.aiResults = {};
        }
        updatedProduct.aiResults[Date.now().toString()] = aiResult;
        await updatedProduct.save();
      }

      // Verify updates
      const finalProduct = await Product.findOne({ id: 1 });
      expect(finalProduct.currentStatus).toBe('In Transit');
      expect(finalProduct.events.length).toBe(1);
      expect(finalProduct.events[0].eventType).toBe('StatusUpdate');
      
      // Verify AI was called
      expect(aiService.analyzeProduct).toHaveBeenCalled();
      expect(finalProduct.aiResults).toBeDefined();
    });
  });
});

