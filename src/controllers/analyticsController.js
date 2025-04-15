const AnalyticsModel = require('../models/analyticsModel');
const ProductModel = require('../models/productModel');

const analyticsController = {
  getDashboardStats: async (req, res) => {
    try {
      
      const [userStats, productStats, orderStats] = await Promise.all([
        AnalyticsModel.getUserStats(),
        AnalyticsModel.getProductStats(),
        AnalyticsModel.getOrderStats()
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          users: userStats,
          products: productStats,
          orders: orderStats
        }
      });
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getUserStats: async (req, res) => {
    try {
      const stats = await AnalyticsModel.getUserStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getUserStats:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getProductStats: async (req, res) => {
    try {
      const stats = await AnalyticsModel.getProductStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getProductStats:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getOrderStats: async (req, res) => {
    try {
      const stats = await AnalyticsModel.getOrderStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getOrderStats:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  logFavorite: async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const event = await AnalyticsModel.logUserEvent({
        userId,
        eventType: 'favorite',
        productId,
        metadata: { timestamp: new Date() }
      });
      
      res.status(200).json({
        success: true,
        message: 'Favorite logged successfully',
        data: { eventId: event.id }
      });
    } catch (error) {
      console.error('Error in logFavorite:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  logNotifyMe: async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId, email } = req.body;
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const event = await AnalyticsModel.logUserEvent({
        userId,
        eventType: 'notify_me',
        productId,
        metadata: { 
          email: email || req.user.email,
          timestamp: new Date()
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Notify me request logged successfully',
        data: { eventId: event.id }
      });
    } catch (error) {
      console.error('Error in logNotifyMe:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  logCartAbandonment: async (req, res) => {
    try {
      const userId = req.user.id;
      const { products, totalAmount } = req.body;
      
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Products array is required and must not be empty'
        });
      }
      
      if (totalAmount === undefined || totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Total amount is required and must be greater than 0'
        });
      }
      
      const event = await AnalyticsModel.logUserEvent({
        userId,
        eventType: 'cart_abandonment',
        productId: null, // No specific product for cart abandonment
        metadata: { 
          products,
          totalAmount,
          timestamp: new Date()
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Cart abandonment logged successfully',
        data: { eventId: event.id }
      });
    } catch (error) {
      console.error('Error in logCartAbandonment:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getTopFavoritedProducts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      const topProducts = await AnalyticsModel.getTopFavoritedProducts(limit);
      
      const productsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await ProductModel.findById(item.productId);
          return {
            ...item,
            product: product || { id: item.productId, title: 'Unknown Product' }
          };
        })
      );
      
      res.status(200).json({
        success: true,
        count: productsWithDetails.length,
        data: productsWithDetails
      });
    } catch (error) {
      console.error('Error in getTopFavoritedProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getTopNotifyMeProducts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      const topProducts = await AnalyticsModel.getTopNotifyMeProducts(limit);
      
      const productsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await ProductModel.findById(item.productId);
          return {
            ...item,
            product: product || { id: item.productId, title: 'Unknown Product' }
          };
        })
      );
      
      res.status(200).json({
        success: true,
        count: productsWithDetails.length,
        data: productsWithDetails
      });
    } catch (error) {
      console.error('Error in getTopNotifyMeProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getRecentCartAbandonment: async (req, res) => {
    try {
      const hours = parseInt(req.query.hours) || 24;
      
      const abandonmentStats = await AnalyticsModel.getRecentCartAbandonment(hours);
      
      res.status(200).json({
        success: true,
        data: abandonmentStats
      });
    } catch (error) {
      console.error('Error in getRecentCartAbandonment:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  logCustomEvent: async (req, res) => {
    try {
      const userId = req.user.id;
      const { eventType, productId, metadata } = req.body;
      
      if (!eventType) {
        return res.status(400).json({
          success: false,
          message: 'Event type is required'
        });
      }
      
      if (productId) {
        const product = await ProductModel.findById(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }
      }
      
      const event = await AnalyticsModel.logUserEvent({
        userId,
        eventType,
        productId,
        metadata: {
          ...metadata,
          timestamp: new Date()
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Event logged successfully',
        data: { eventId: event.id }
      });
    } catch (error) {
      console.error('Error in logCustomEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = analyticsController;
