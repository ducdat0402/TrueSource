// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TrueSource-test';

