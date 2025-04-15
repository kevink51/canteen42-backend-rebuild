const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getDashboardStats);
router.get('/products', adminController.manageProducts);
router.get('/users', adminController.manageUsers);
router.get('/orders', adminController.manageOrders);
router.get('/analytics', adminController.getAnalytics);
router.post('/bulk', adminController.bulkOperations);

module.exports = router;
