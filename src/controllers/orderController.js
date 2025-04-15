const OrderModel = require('../models/orderModel');
const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');
const stripeService = require('../services/stripeService');

const validateOrder = (order) => {
  const errors = [];
  
  if (!order.userId) {
    errors.push('User ID is required');
  }
  
  if (!order.products || !Array.isArray(order.products) || order.products.length === 0) {
    errors.push('Products array is required and must not be empty');
  } else {
    for (const product of order.products) {
      if (!product.productId) {
        errors.push('Product ID is required for each product');
      }
      if (!product.quantity || product.quantity < 1) {
        errors.push('Quantity must be at least 1 for each product');
      }
    }
  }
  
  if (order.totalAmount === undefined || order.totalAmount <= 0) {
    errors.push('Total amount is required and must be greater than 0');
  }
  
  if (order.status && !['pending', 'shipped', 'delivered', 'cancelled'].includes(order.status)) {
    errors.push('Status must be one of: pending, shipped, delivered, cancelled');
  }
  
  return errors;
};

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const filters = {};
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      
      if (req.user.role !== 'admin') {
        filters.userId = req.user.id;
      } else if (req.query.userId) {
        filters.userId = req.query.userId;
      }
      
      const orders = await OrderModel.findAll(filters);
      
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error('Error in getAllOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getOrderById: async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      if (req.user.role !== 'admin' && order.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own orders'
        });
      }
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error in getOrderById:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  createOrder: async (req, res) => {
    try {
      const orderData = {
        userId: req.user.id, // Set from authenticated user
        products: req.body.products,
        totalAmount: req.body.totalAmount,
        status: 'pending', // Default status for new orders
        stripePaymentId: req.body.stripePaymentId
      };
      
      const validationErrors = validateOrder(orderData);
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      let calculatedTotal = 0;
      for (const item of orderData.products) {
        const product = await ProductModel.findById(item.productId);
        
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product with ID ${item.productId} not found`
          });
        }
        
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for product ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`
          });
        }
        
        calculatedTotal += product.price * item.quantity;
      }
      
      if (Math.abs(calculatedTotal - orderData.totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total amount mismatch. Calculated: ${calculatedTotal}, Provided: ${orderData.totalAmount}`
        });
      }
      
      if (!orderData.stripePaymentId) {
        try {
          const paymentIntent = await stripeService.createPaymentIntent(orderData.totalAmount, {
            userId: orderData.userId,
            products: orderData.products.map(p => p.productId)
          });
          
          orderData.stripePaymentId = paymentIntent.id;
        } catch (stripeError) {
          console.error('Stripe payment creation error:', stripeError);
          if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
              success: false,
              message: 'Payment processing error',
              error: stripeError.message
            });
          }
        }
      }
      
      const newOrder = await OrderModel.create(orderData);
      
      for (const item of orderData.products) {
        const product = await ProductModel.findById(item.productId);
        await ProductModel.update(item.productId, {
          stock: product.stock - item.quantity
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: newOrder
      });
    } catch (error) {
      console.error('Error in createOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  updateOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      if (req.user.role !== 'admin') {
        if (order.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only update your own orders'
          });
        }
        
        if (order.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Only pending orders can be updated'
          });
        }
      }
      
      const updateData = {};
      
      if (order.status === 'pending') {
        if (req.body.products !== undefined) updateData.products = req.body.products;
        if (req.body.totalAmount !== undefined) updateData.totalAmount = req.body.totalAmount;
      }
      
      if (req.user.role === 'admin' && req.body.status !== undefined) {
        updateData.status = req.body.status;
      }
      
      if (req.user.role === 'admin' && req.body.stripePaymentId !== undefined) {
        updateData.stripePaymentId = req.body.stripePaymentId;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }
      
      const validationErrors = validateOrder({ ...order, ...updateData });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      if (updateData.products) {
        let calculatedTotal = 0;
        for (const item of updateData.products) {
          const product = await ProductModel.findById(item.productId);
          
          if (!product) {
            return res.status(400).json({
              success: false,
              message: `Product with ID ${item.productId} not found`
            });
          }
          
          calculatedTotal += product.price * item.quantity;
        }
        
        if (updateData.totalAmount === undefined) {
          updateData.totalAmount = calculatedTotal;
        } else if (Math.abs(calculatedTotal - updateData.totalAmount) > 0.01) {
          return res.status(400).json({
            success: false,
            message: `Total amount mismatch. Calculated: ${calculatedTotal}, Provided: ${updateData.totalAmount}`
          });
        }
      }
      
      const updatedOrder = await OrderModel.update(orderId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error in updateOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  updateOrderStatus: async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      
      if (!status || !['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status is required (pending, shipped, delivered, cancelled)'
        });
      }
      
      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      const updatedOrder = await OrderModel.updateStatus(orderId, status);
      
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  cancelOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      if (req.user.role !== 'admin') {
        if (order.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only cancel your own orders'
          });
        }
        
        if (order.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Only pending orders can be cancelled'
          });
        }
      }
      
      if (order.status === 'cancelled') {
        return res.status(200).json({
          success: true,
          message: 'Order is already cancelled',
          data: order
        });
      }
      
      const updatedOrder = await OrderModel.updateStatus(orderId, 'cancelled');
      
      for (const item of order.products) {
        const product = await ProductModel.findById(item.productId);
        if (product) {
          await ProductModel.update(item.productId, {
            stock: product.stock + item.quantity
          });
        }
      }
      
      if (order.stripePaymentId) {
        try {
          await stripeService.refundPayment(order.stripePaymentId);
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
              success: false,
              message: 'Payment refund error',
              error: stripeError.message
            });
          }
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error in cancelOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  deleteOrder: async (req, res) => {
    try {
      const orderId = req.params.id;
      
      const deletedOrder = await OrderModel.delete(orderId);
      
      if (!deletedOrder) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Order deleted successfully',
        data: deletedOrder
      });
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = orderController;
