const express = require('express');
const app = express();
const PORT = 3004;

const AnalyticsModel = require('./src/models/analyticsModel');
const analyticsController = require('./src/controllers/analyticsController');

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
  res.json({ message: 'Analytics API test server is running' });
});

app.get('/api/analytics/dashboard', analyticsController.getDashboardStats);
app.get('/api/analytics/users', analyticsController.getUserStats);
app.get('/api/analytics/products', analyticsController.getProductStats);
app.get('/api/analytics/orders', analyticsController.getOrderStats);

app.post('/api/analytics/events/favorite', analyticsController.logFavorite);
app.post('/api/analytics/events/notify-me', analyticsController.logNotifyMe);
app.post('/api/analytics/events/cart-abandonment', analyticsController.logCartAbandonment);
app.post('/api/analytics/events/custom', analyticsController.logCustomEvent);

app.get('/api/analytics/top-favorited', analyticsController.getTopFavoritedProducts);
app.get('/api/analytics/top-notify-me', analyticsController.getTopNotifyMeProducts);
app.get('/api/analytics/cart-abandonment', analyticsController.getRecentCartAbandonment);

app.get('/test-log-events', async (req, res) => {
  try {
    console.log('Logging test events...');
    
    const ProductModel = require('./src/models/productModel');
    
    const product1 = await ProductModel.create({
      id: 'test-product-1',
      title: 'Test Product 1',
      description: 'Test product for analytics testing',
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
    
    console.log('Logging favorite events...');
    await AnalyticsModel.logUserEvent({
      userId: 'user-1',
      eventType: 'favorite',
      productId: 'test-product-1',
      metadata: { timestamp: new Date() }
    });
    
    await AnalyticsModel.logUserEvent({
      userId: 'user-2',
      eventType: 'favorite',
      productId: 'test-product-1',
      metadata: { timestamp: new Date() }
    });
    
    await AnalyticsModel.logUserEvent({
      userId: 'user-3',
      eventType: 'favorite',
      productId: 'test-product-2',
      metadata: { timestamp: new Date() }
    });
    
    console.log('Logging notify me events...');
    await AnalyticsModel.logUserEvent({
      userId: 'user-1',
      eventType: 'notify_me',
      productId: 'test-product-2',
      metadata: { email: 'user1@example.com', timestamp: new Date() }
    });
    
    await AnalyticsModel.logUserEvent({
      userId: 'user-2',
      eventType: 'notify_me',
      productId: 'test-product-2',
      metadata: { email: 'user2@example.com', timestamp: new Date() }
    });
    
    console.log('Logging cart abandonment events...');
    await AnalyticsModel.logUserEvent({
      userId: 'user-1',
      eventType: 'cart_abandonment',
      productId: null,
      metadata: { 
        products: [
          { productId: 'test-product-1', quantity: 2 },
          { productId: 'test-product-2', quantity: 1 }
        ],
        totalAmount: 129.97,
        timestamp: new Date()
      }
    });
    
    await AnalyticsModel.logUserEvent({
      userId: 'user-3',
      eventType: 'cart_abandonment',
      productId: null,
      metadata: { 
        products: [
          { productId: 'test-product-2', quantity: 3 }
        ],
        totalAmount: 89.97,
        timestamp: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Test events logged successfully',
      data: {
        favorites: 3,
        notifyMe: 2,
        cartAbandonment: 2
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-get-stats', async (req, res) => {
  try {
    console.log('Getting analytics stats...');
    
    const [topFavorited, topNotifyMe, cartAbandonment] = await Promise.all([
      AnalyticsModel.getTopFavoritedProducts(),
      AnalyticsModel.getTopNotifyMeProducts(),
      AnalyticsModel.getRecentCartAbandonment(24)
    ]);
    
    res.json({
      success: true,
      data: {
        topFavorited,
        topNotifyMe,
        cartAbandonment
      }
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
  console.log(`Analytics test server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`- http://localhost:${PORT}/test-log-events`);
  console.log(`- http://localhost:${PORT}/test-get-stats`);
  console.log(`- http://localhost:${PORT}/api/analytics/dashboard`);
});
