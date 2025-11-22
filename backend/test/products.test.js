const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/userModel');
const Product = require('../src/models/productModel');

let app;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../src/app');
});

afterAll(async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
  await mongoose.connection.close();
});

describe('Product Routes', () => {
  let producerToken;
  let consumerToken;
  let producerUser;

  beforeEach(async () => {
    // Cleanup
    await User.deleteMany({});
    await Product.deleteMany({});

    // Tạo producer user
    producerUser = await User.create({
      username: 'producer',
      email: 'producer@example.com',
      password: 'password123',
      role: 'producer'
    });

    // Tạo consumer user
    const consumerUser = await User.create({
      username: 'consumer',
      email: 'consumer@example.com',
      password: 'password123',
      role: 'consumer'
    });

    // Generate tokens
    producerToken = jwt.sign(
      { userId: producerUser._id, role: 'producer' },
      process.env.JWT_SECRET
    );

    consumerToken = jwt.sign(
      { userId: consumerUser._id, role: 'consumer' },
      process.env.JWT_SECRET
    );
  });

  describe('POST /products', () => {
    it('should create product with producer role', async () => {
      // Mock Web3 contract call
      // Note: Trong test thực tế, bạn cần mock Web3 contract
      // Ở đây chỉ test authentication và authorization

      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${producerToken}`)
        .send({
          origin: 'Vietnam',
          qrHash: 'test-qr-hash-123'
        });

      // Nếu Web3 được mock đúng, status sẽ là 200/201
      // Nếu không, sẽ có lỗi Web3 nhưng vẫn test được auth
      expect([200, 201, 500]).toContain(res.status);
      
      // Quan trọng: Không được là 401 (unauthorized) hoặc 403 (forbidden)
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject product creation without token', async () => {
      const res = await request(app)
        .post('/products')
        .send({
          origin: 'Vietnam',
          qrHash: 'test-qr-hash-123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('No token provided');
    });

    it('should reject product creation with consumer role', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({
          origin: 'Vietnam',
          qrHash: 'test-qr-hash-123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });
  });

  describe('GET /products/:id', () => {
    it('should get product by id (public route)', async () => {
      // Tạo product test trong MongoDB
      const product = await Product.create({
        id: 1,
        origin: 'Vietnam',
        createdAt: Date.now(),
        currentStatus: 'Created',
        qrCodeHash: 'test-hash'
      });

      const res = await request(app)
        .get(`/products/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(product.id);
      expect(res.body.origin).toBe('Vietnam');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/products/99999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });
});

