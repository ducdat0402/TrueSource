const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/userModel');

// Import app - cần tách app ra file riêng để test
// Tạm thời sẽ test với app được export
let app;

beforeAll(async () => {
  // Kết nối test database
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Import app sau khi setup
  app = require('../src/app');
});

afterAll(async () => {
  // Cleanup
  await User.deleteMany({});
  await mongoose.connection.close();
});

describe('Authentication Routes', () => {
  beforeEach(async () => {
    // Xóa users trước mỗi test
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'producer'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('producer');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser'
          // Missing email and password
        });

      expect(res.status).toBe(400);
    });

    it('should reject registration with duplicate email', async () => {
      // Tạo user đầu tiên
      await User.create({
        username: 'user1',
        email: 'test@example.com',
        password: 'password123'
      });

      // Thử tạo user thứ 2 với cùng email
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'user2',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Tạo user test
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'producer'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });
  });
});

