const express = require('express');
const app = express();
const PORT = 3006;

const DiscountModel = require('./src/models/discountModel');
const discountController = require('./src/controllers/discountController');
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
  res.json({ message: 'Discount API test server is running' });
});

app.get('/api/discounts', discountController.getAllDiscounts);
app.get('/api/discounts/:id', discountController.getDiscountById);
app.post('/api/discounts', discountController.createDiscount);
app.put('/api/discounts/:id', discountController.updateDiscount);
app.delete('/api/discounts/:id', discountController.deleteDiscount);

app.get('/api/discounts/:id/stats', discountController.getDiscountStats);
app.get('/api/discounts/:id/redemptions', discountController.getDiscountRedemptions);

app.post('/api/discounts/apply', discountController.applyDiscount);
app.post('/api/discounts/redemption', discountController.recordRedemption);

app.get('/test-setup', async (req, res) => {
  try {
    console.log('Setting up test data...');
    
    await DiscountModel.initTable();
    
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
      description: 'Test product for discount testing',
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

app.get('/test-create-discounts', async (req, res) => {
  try {
    console.log('Creating test discounts...');
    
    const cartTotalDiscount = await DiscountModel.create({
      name: 'Spend $100, Get $20 Off',
      description: 'Get $20 off when you spend $100 or more',
      discountType: 'fixed',
      triggerType: 'cart_total',
      triggerCondition: {
        operator: 'gte',
        value: 100
      },
      discountValue: 20,
      isActive: true,
      isAutoApply: true,
      priority: 1
    });
    console.log('Created cart total discount:', cartTotalDiscount);
    
    const itemQuantityDiscount = await DiscountModel.create({
      name: 'Buy 3 or more items, Get 15% Off',
      description: 'Get 15% off when you buy 3 or more items',
      discountType: 'percentage',
      triggerType: 'item_quantity',
      triggerCondition: {
        operator: 'gte',
        quantity: 3
      },
      discountValue: 15,
      isActive: true,
      isAutoApply: true,
      priority: 2
    });
    console.log('Created item quantity discount:', itemQuantityDiscount);
    
    const productComboDiscount = await DiscountModel.create({
      name: 'Bundle Discount',
      description: 'Get $15 off when you buy both products together',
      discountType: 'fixed',
      triggerType: 'product_combo',
      triggerCondition: {
        requiredProducts: ['test-product-1', 'test-product-2'],
        operator: 'all'
      },
      discountValue: 15,
      isActive: true,
      isAutoApply: true,
      priority: 3
    });
    console.log('Created product combo discount:', productComboDiscount);
    
    const couponDiscount = await DiscountModel.create({
      name: 'WELCOME10 Coupon',
      description: 'Get 10% off with coupon code WELCOME10',
      discountType: 'percentage',
      triggerType: 'cart_total',
      triggerCondition: {
        operator: 'gt',
        value: 0
      },
      discountValue: 10,
      isActive: true,
      isAutoApply: false,
      couponCode: 'WELCOME10',
      priority: 0
    });
    console.log('Created coupon discount:', couponDiscount);
    
    res.json({
      success: true,
      message: 'Test discounts created successfully',
      data: {
        cartTotalDiscount,
        itemQuantityDiscount,
        productComboDiscount,
        couponDiscount
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-apply-discounts', async (req, res) => {
  try {
    console.log('Testing discount application...');
    
    const cart1 = {
      products: [
        { productId: 'test-product-1', quantity: 2 },
        { productId: 'test-product-2', quantity: 1 }
      ],
      totalAmount: (49.99 * 2) + 29.99
    };
    
    const cart2 = {
      products: [
        { productId: 'test-product-1', quantity: 2 },
        { productId: 'test-product-2', quantity: 2 }
      ],
      totalAmount: (49.99 * 2) + (29.99 * 2)
    };
    
    const cart3 = {
      products: [
        { productId: 'test-product-1', quantity: 1 }
      ],
      totalAmount: 49.99
    };
    
    const autoResult1 = await discountController.applyDiscount({
      body: { cart: cart1 },
      user: { id: 'test-user-id', role: 'user' }
    }, {
      status: (code) => ({ json: (data) => data })
    });
    
    const autoResult2 = await discountController.applyDiscount({
      body: { cart: cart2 },
      user: { id: 'test-user-id', role: 'user' }
    }, {
      status: (code) => ({ json: (data) => data })
    });
    
    const autoResult3 = await discountController.applyDiscount({
      body: { cart: cart3 },
      user: { id: 'test-user-id', role: 'user' }
    }, {
      status: (code) => ({ json: (data) => data })
    });
    
    const couponResult = await discountController.applyDiscount({
      body: { cart: cart3, couponCode: 'WELCOME10' },
      user: { id: 'test-user-id', role: 'user' }
    }, {
      status: (code) => ({ json: (data) => data })
    });
    
    res.json({
      success: true,
      message: 'Discount application tests completed',
      data: {
        cart1: {
          original: cart1,
          result: autoResult1
        },
        cart2: {
          original: cart2,
          result: autoResult2
        },
        cart3: {
          original: cart3,
          result: autoResult3
        },
        coupon: {
          original: cart3,
          result: couponResult
        }
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-redemption', async (req, res) => {
  try {
    console.log('Testing discount redemption...');
    
    const discounts = await DiscountModel.findAll();
    
    if (discounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No discounts found. Run /test-create-discounts first.'
      });
    }
    
    const redemption = await DiscountModel.recordRedemption({
      discountId: discounts[0].id,
      userId: 'test-user-id',
      orderId: 'test-order-123',
      amountSaved: 20,
      metadata: {
        products: [
          { productId: 'test-product-1', quantity: 2 },
          { productId: 'test-product-2', quantity: 1 }
        ],
        originalAmount: 129.97,
        finalAmount: 109.97
      }
    });
    
    const stats = await DiscountModel.getRedemptionStats(discounts[0].id);
    
    const redemptions = await DiscountModel.getRedemptionsByDiscountId(discounts[0].id);
    
    res.json({
      success: true,
      message: 'Discount redemption test completed',
      data: {
        redemption,
        stats,
        redemptions
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
  console.log(`Discount test server running on port ${PORT}`);
  console.log(`Test endpoints:`);
  console.log(`- http://localhost:${PORT}/test-setup`);
  console.log(`- http://localhost:${PORT}/test-create-discounts`);
  console.log(`- http://localhost:${PORT}/test-apply-discounts`);
  console.log(`- http://localhost:${PORT}/test-redemption`);
});
