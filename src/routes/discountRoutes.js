const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/', verifyToken, isAdmin, discountController.getAllDiscounts);
router.get('/:id', verifyToken, isAdmin, discountController.getDiscountById);
router.post('/', verifyToken, isAdmin, discountController.createDiscount);
router.put('/:id', verifyToken, isAdmin, discountController.updateDiscount);
router.delete('/:id', verifyToken, isAdmin, discountController.deleteDiscount);

router.get('/:id/stats', verifyToken, isAdmin, discountController.getDiscountStats);
router.get('/:id/redemptions', verifyToken, isAdmin, discountController.getDiscountRedemptions);

router.post('/apply', verifyToken, discountController.applyDiscount);
router.post('/redemption', verifyToken, discountController.recordRedemption);

module.exports = router;
