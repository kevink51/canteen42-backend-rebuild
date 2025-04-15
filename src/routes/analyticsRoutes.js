const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/dashboard', isAdmin, analyticsController.getDashboardStats);
router.get('/users', isAdmin, analyticsController.getUserStats);
router.get('/products', isAdmin, analyticsController.getProductStats);
router.get('/orders', isAdmin, analyticsController.getOrderStats);

router.post('/events/favorite', verifyToken, analyticsController.logFavorite);
router.post('/events/notify-me', verifyToken, analyticsController.logNotifyMe);
router.post('/events/cart-abandonment', verifyToken, analyticsController.logCartAbandonment);
router.post('/events/custom', verifyToken, analyticsController.logCustomEvent);

router.get('/top-favorited', verifyToken, analyticsController.getTopFavoritedProducts);
router.get('/top-notify-me', verifyToken, analyticsController.getTopNotifyMeProducts);
router.get('/cart-abandonment', verifyToken, analyticsController.getRecentCartAbandonment);

module.exports = router;
