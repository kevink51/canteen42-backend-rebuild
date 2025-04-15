const express = require('express');
const app = express();
const PORT = 3005;

const EmailTemplateModel = require('./src/models/emailTemplateModel');
const emailController = require('./src/controllers/emailController');
const UserModel = require('./src/models/userModel');
const ProductModel = require('./src/models/productModel');

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
  res.json({ message: 'Email API test server is running' });
});

app.get('/api/email/templates', emailController.getAllTemplates);
app.get('/api/email/templates/:id', emailController.getTemplateById);
app.post('/api/email/templates', emailController.createTemplate);
app.put('/api/email/templates/:id', emailController.updateTemplate);
app.delete('/api/email/templates/:id', emailController.deleteTemplate);

app.post('/api/email/trigger/notify-me', emailController.triggerNotifyMeEmail);
app.post('/api/email/trigger/favorite', emailController.triggerFavoriteEmail);
app.post('/api/email/trigger/cart-abandonment', emailController.triggerCartAbandonmentEmail);

app.get('/test-setup', async (req, res) => {
  try {
    console.log('Setting up test data...');
    
    await EmailTemplateModel.initTable();
    
    const user = await UserModel.create({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('Created test user:', user);
    
    const product1 = await ProductModel.create({
      id: 'test-product-1',
      title: 'Test Product 1',
      description: 'Test product for email testing',
      price: 49.99,
      variants: ['Default'],
      stock: 10,
      status: 'active'
    });
    console.log('Created test product 1:', product1);
    
    const product2 = await ProductModel.create({
      id: 'test-product-2',
      title: 'Test Product 2',
      description: 'Another test product',
      price: 29.99,
      variants: ['Default'],
      stock: 5,
      status: 'active'
    });
    console.log('Created test product 2:', product2);
    
    res.json({ 
      success: true, 
      message: 'Test setup completed successfully',
      data: {
        user,
        products: [product1, product2]
      }
    });
  } catch (error) {
    console.error('Test setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-templates', async (req, res) => {
  try {
    console.log('Getting email templates...');
    
    const templates = await EmailTemplateModel.findAll();
    
    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-notify-me', async (req, res) => {
  try {
    console.log('Testing Notify Me email...');
    
    const result = await emailController.handleNotifyMeEvent(
      'test-user-id',
      'test-product-1',
      'test@example.com'
    );
    
    res.json({
      success: true,
      message: 'Notify Me email test completed',
      result
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-favorite', async (req, res) => {
  try {
    console.log('Testing Favorite email...');
    
    const result = await emailController.handleFavoriteEvent(
      'test-user-id',
      'test-product-1'
    );
    
    res.json({
      success: true,
      message: 'Favorite email test completed',
      result
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-cart-abandonment', async (req, res) => {
  try {
    console.log('Testing Cart Abandonment email...');
    
    const cartItems = [
      { productId: 'test-product-1', quantity: 2 },
      { productId: 'test-product-2', quantity: 1 }
    ];
    
    const cartTotal = (49.99 * 2) + (29.99 * 1);
    
    const result = await emailController.handleCartAbandonmentEvent(
      'test-user-id',
      cartItems,
      cartTotal,
      'http://localhost:3000/checkout'
    );
    
    res.json({
      success: true,
      message: 'Cart abandonment email test completed',
      result
    });
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
  console.log(`Email test server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`- http://localhost:${PORT}/test-setup`);
  console.log(`- http://localhost:${PORT}/test-templates`);
  console.log(`- http://localhost:${PORT}/test-notify-me`);
  console.log(`- http://localhost:${PORT}/test-favorite`);
  console.log(`- http://localhost:${PORT}/test-cart-abandonment`);
});
