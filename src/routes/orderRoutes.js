const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/', orderController.getAllOrders);

router.get('/:id', orderController.getOrderById);

router.post('/', orderController.createOrder);

router.put('/:id', orderController.updateOrder);

router.post('/:id/cancel', orderController.cancelOrder);

router.patch('/:id/status', isAdmin, orderController.updateOrderStatus);

router.delete('/:id', isAdmin, orderController.deleteOrder);

module.exports = router;
