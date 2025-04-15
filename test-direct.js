const express = require('express');
const app = express();
const PORT = 3002;

const ProductModel = require('./src/models/productModel');
const productController = require('./src/controllers/productController');

app.use(express.json());

console.log('Product Controller Methods:', Object.keys(productController));

app.get('/api/products', productController.getAllProducts);
app.get('/api/products/:id', productController.getProductById);
app.post('/api/products', productController.createProduct);
app.put('/api/products/:id', productController.updateProduct);
app.delete('/api/products/:id', productController.deleteProduct);

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/products`);
});
