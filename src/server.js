const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testPgConnection, connectMongoDB, inMemoryStore } = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const ProductModel = require('./models/productModel');
const UserModel = require('./models/userModel');
const OrderModel = require('./models/orderModel');
const AnalyticsModel = require('./models/analyticsModel');
const EmailTemplateModel = require('./models/emailTemplateModel');
const DiscountModel = require('./models/discountModel');

const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const emailRoutes = require('./routes/emailRoutes');
const discountRoutes = require('./routes/discountRoutes');

const { verifyToken, isAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CANTEEN42 API' });
});

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes); // No verifyToken here to allow public access to register/login
app.use('/api/orders', verifyToken, orderRoutes);
app.use('/api/admin', verifyToken, isAdmin, adminRoutes);
app.use('/api/analytics', analyticsRoutes); // Some endpoints require admin, enforced in routes
app.use('/api/email', emailRoutes); // Some endpoints require admin, enforced in routes
app.use('/api/discounts', discountRoutes); // Some endpoints require admin, enforced in routes

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const stripeService = require('./services/stripeService');
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('Missing Stripe signature or webhook secret');
      return res.status(400).json({ error: 'Missing signature' });
    }
    
    let event;
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Stripe webhook verification error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    
    const result = await stripeService.handleWebhookEvent(event);
    
    res.status(200).json({ received: true, result });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  const statusCode = err.statusCode || 500;
  
  const errorResponse = {
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      details: err.details || null
    } : undefined
  };
  
  res.status(statusCode).json(errorResponse);
});

const startServer = async () => {
  try {
    const pgConnected = await testPgConnection();
    if (!pgConnected) {
      console.log('PostgreSQL not connected. Using in-memory store for development.');
    } else {
      await ProductModel.initTable();
      await UserModel.initTable();
      await OrderModel.initTable();
      await AnalyticsModel.initTable();
      await EmailTemplateModel.initTable();
      await DiscountModel.initTable();
    }
    
    await connectMongoDB();
    
    initializeFirebase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('Continuing in development mode despite errors');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in fallback mode`);
        console.log(`API available at http://localhost:${PORT}`);
      });
    }
  }
};

startServer();

module.exports = app; // Export for testing
