const OrderModel = require('./src/models/orderModel');
const ProductModel = require('./src/models/productModel');

async function testOrderSystem() {
  try {
    console.log('Starting order system test...');
    
    console.log('Creating test products...');
    const product1 = await ProductModel.create({
      id: 'test-product-1',
      title: 'Test Product 1',
      description: 'Test product for order testing',
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
    
    console.log('Creating test order...');
    const orderData = {
      userId: 'test-user-id',
      products: [
        { productId: 'test-product-1', quantity: 2 },
        { productId: 'test-product-2', quantity: 1 }
      ],
      totalAmount: (49.99 * 2) + (29.99 * 1),
      status: 'pending',
      stripePaymentId: 'test-payment-123'
    };
    
    const order = await OrderModel.create(orderData);
    console.log('Created test order:', order);
    
    console.log('Finding order by ID...');
    const foundOrder = await OrderModel.findById(order.id);
    console.log('Found order:', foundOrder);
    
    console.log('Updating order status...');
    const updatedOrder = await OrderModel.updateStatus(order.id, 'shipped');
    console.log('Updated order:', updatedOrder);
    
    console.log('Finding all orders...');
    const allOrders = await OrderModel.findAll();
    console.log('All orders count:', allOrders.length);
    
    console.log('Deleting order...');
    const deletedOrder = await OrderModel.delete(order.id);
    console.log('Deleted order:', deletedOrder);
    
    console.log('Order system test completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  }
}

testOrderSystem();
