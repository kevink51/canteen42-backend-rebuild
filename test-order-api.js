const express = require('express');
const app = express();
const PORT = 3003;

const OrderModel = require('./src/models/orderModel');
const orderController = require('./src/controllers/orderController');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'admin' // Use 'admin' to test all endpoints
  };
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Order API test server is running' });
});

app.get('/api/orders', orderController.getAllOrders);
app.get('/api/orders/:id', orderController.getOrderById);
app.post('/api/orders', orderController.createOrder);
app.put('/api/orders/:id', orderController.updateOrder);
app.post('/api/orders/:id/cancel', orderController.cancelOrder);
app.patch('/api/orders/:id/status', orderController.updateOrderStatus);
app.delete('/api/orders/:id', orderController.deleteOrder);

app.get('/test-create-order', async (req, res) => {
  try {
    const mockReq = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user'
      },
      body: {
        products: [
          { productId: 'test-product-1', quantity: 2 },
          { productId: 'test-product-2', quantity: 1 }
        ],
        totalAmount: 99.99,
        stripePaymentId: 'test-payment-123'
      }
    };
    
    const mockRes = {
      status: function(code) {
        console.log('Status code:', code);
        return this;
      },
      json: function(data) {
        console.log('Response data:', JSON.stringify(data, null, 2));
        res.json({ 
          testResult: 'Order creation test completed',
          statusCode: 201,
          responseData: data
        });
        return this;
      }
    };
    
    const ProductModel = require('./src/models/productModel');
    
    const product1 = await ProductModel.create({
      id: 'test-product-1', // Match the ID in the order
      title: 'Test Product 1',
      description: 'Test product for order testing',
      price: 49.99,
      variants: ['Default'],
      stock: 10,
      status: 'active'
    });
    console.log('Created test product 1:', product1);
    
    const product2 = await ProductModel.create({
      id: 'test-product-2', // Match the ID in the order
      title: 'Test Product 2',
      description: 'Another test product',
      price: 29.99,
      variants: ['Default'],
      stock: 5,
      status: 'active'
    });
    console.log('Created test product 2:', product2);
    
    mockReq.body.totalAmount = (49.99 * 2) + (29.99 * 1);
    
    await orderController.createOrder(mockReq, mockRes);
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Server error', 
    error: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Order test server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/test-create-order`);
});
