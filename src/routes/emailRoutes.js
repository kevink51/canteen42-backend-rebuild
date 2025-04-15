const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/templates', verifyToken, isAdmin, emailController.getAllTemplates);
router.get('/templates/:id', verifyToken, isAdmin, emailController.getTemplateById);
router.post('/templates', verifyToken, isAdmin, emailController.createTemplate);
router.put('/templates/:id', verifyToken, isAdmin, emailController.updateTemplate);
router.delete('/templates/:id', verifyToken, isAdmin, emailController.deleteTemplate);

router.post('/trigger/notify-me', verifyToken, emailController.triggerNotifyMeEmail);
router.post('/trigger/favorite', verifyToken, emailController.triggerFavoriteEmail);
router.post('/trigger/cart-abandonment', verifyToken, emailController.triggerCartAbandonmentEmail);

module.exports = router;
