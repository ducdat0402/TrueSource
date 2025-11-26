const express = require('express');
const { authenticate, authorize, requireVerifiedProducer } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const producerVerificationController = require('../controllers/producerVerificationController');
const router = express.Router();

// Public routes (no auth required)
router.get('/trace/:id', userController.traceProduct); // Public trace
router.get('/search', userController.searchProducts); // Public search
router.get('/products/:id/ai-insights', userController.getAIInsights); // Public AI insights

// Protected routes (auth required)
router.get('/dashboard', authenticate, userController.getDashboard);
router.get('/products', authenticate, userController.getMyProducts);

// Producer verification routes
router.post('/verification/register', authenticate, authorize('producer'), producerVerificationController.registerVerification);
router.get('/verification/status', authenticate, authorize('producer'), producerVerificationController.getVerificationStatus);

// Producer only routes (require verified)
router.post('/products/:id/update-status', authenticate, authorize('producer', 'admin'), requireVerifiedProducer, userController.updateProductStatus);

module.exports = router;

