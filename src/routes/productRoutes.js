const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/test', (req, res) => {
  res.json({ message: 'Test route is working!' });
});


// Get all products
router.get('/', productController.getAllProducts);

// Get a single product by ID
router.get('/:id', productController.getProductById);

// Create a new product
router.post('/', productController.createProduct);

// Update a product
router.put('/:id', productController.updateProduct);

// Delete a product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
