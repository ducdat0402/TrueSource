const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const producerVerificationController = require('../controllers/producerVerificationController');
const router = express.Router();

// Tất cả admin routes đều cần authenticate và authorize('admin')
router.use(authenticate);
router.use(authorize('admin'));

// User Management
router.get('/users', adminController.listUsers);
router.post('/users/:userId/grant-role', adminController.grantRole);
router.post('/users/:userId/revoke-role', adminController.revokeRole);

// Product Management
router.get('/products', adminController.listProducts);
router.post('/products/:id/approve', adminController.approveProduct);
router.post('/products/:id/soft-delete', adminController.softDeleteProduct);
router.post('/products/bulk-update', adminController.bulkUpdateProducts);
router.get('/products/export', adminController.exportProducts);

// AI Management
router.post('/analyze-product/:id', adminController.triggerAIAnalysis);
router.post('/ai/retrain', adminController.retrainMLModel);
router.get('/anomalies', adminController.getAnomalies);
router.get('/ai-results', adminController.getAIResults);

// System Monitoring
router.get('/logs', adminController.getLogs);
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/charts', analyticsController.getChartData);

// Producer Verification Management
router.get('/producers/pending', producerVerificationController.getPendingVerifications);
router.post('/producers/:verificationId/approve', producerVerificationController.approveVerification);
router.post('/producers/:verificationId/reject', producerVerificationController.rejectVerification);

module.exports = router;

