const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');
const OrderModel = require('../models/orderModel');
const AnalyticsModel = require('../models/analyticsModel');

const adminController = {
  bulkOperations: async (req, res) => {
    try {
      const { operation, type, ids } = req.body;
      
      if (!operation || !type || !ids || !Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request. Required: operation, type, and ids array'
        });
      }
      
      let result;
      
      switch (type) {
        case 'products':
          if (operation === 'delete') {
            result = await Promise.all(ids.map(id => ProductModel.delete(id)));
          } else if (operation === 'update') {
            const { status } = req.body;
            if (status) {
              result = await Promise.all(ids.map(id => ProductModel.update(id, { status })));
            } else {
              return res.status(400).json({
                success: false,
                message: 'Update operation requires additional fields'
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              message: 'Unsupported operation for products'
            });
          }
          break;
          
        case 'users':
          if (operation === 'delete') {
            result = await Promise.all(ids.map(id => UserModel.delete(id)));
          } else if (operation === 'update') {
            const { role } = req.body;
            if (role) {
              result = await Promise.all(ids.map(id => UserModel.update(id, { role })));
            } else {
              return res.status(400).json({
                success: false,
                message: 'Update operation requires additional fields'
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              message: 'Unsupported operation for users'
            });
          }
          break;
          
        case 'orders':
          if (operation === 'delete') {
            result = await Promise.all(ids.map(id => OrderModel.delete(id)));
          } else if (operation === 'update') {
            const { status } = req.body;
            if (status) {
              result = await Promise.all(ids.map(id => OrderModel.update(id, { status })));
            } else {
              return res.status(400).json({
                success: false,
                message: 'Update operation requires additional fields'
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              message: 'Unsupported operation for orders'
            });
          }
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported resource type'
          });
      }
      
      res.status(200).json({
        success: true,
        message: `Bulk ${operation} completed for ${type}`,
        data: result.filter(item => item !== null)
      });
    } catch (error) {
      console.error('Error in bulkOperations:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getDashboardStats: async (req, res) => {
    try {
      const [products, users, orders] = await Promise.all([
        ProductModel.findAll(),
        UserModel.findAll(),
        OrderModel.findAll()
      ]);
      
      const completedOrders = orders.filter(order => order.status === 'delivered' || order.status === 'completed');
      const dailyRevenue = completedOrders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          const today = new Date();
          return orderDate.toDateString() === today.toDateString();
        })
        .reduce((sum, order) => sum + order.total_amount, 0);
      
      const weeklyRevenue = completedOrders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return orderDate >= oneWeekAgo;
        })
        .reduce((sum, order) => sum + order.total_amount, 0);
      
      const monthlyRevenue = completedOrders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return orderDate >= oneMonthAgo;
        })
        .reduce((sum, order) => sum + order.total_amount, 0);
      
      const recentOrders = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      
      res.status(200).json({
        success: true,
        message: 'Admin dashboard statistics',
        data: {
          totalProducts: products.length,
          totalUsers: users.length,
          totalOrders: orders.length,
          recentOrders,
          revenue: {
            daily: dailyRevenue,
            weekly: weeklyRevenue,
            monthly: monthlyRevenue
          }
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
  
  manageProducts: async (req, res) => {
    try {
      const products = await ProductModel.findAll();
      
      res.status(200).json({
        success: true,
        message: 'Admin product management',
        data: products
      });
    } catch (error) {
      console.error('Error in manageProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  manageUsers: async (req, res) => {
    try {
      const users = await UserModel.findAll();
      
      res.status(200).json({
        success: true,
        message: 'Admin user management',
        data: users
      });
    } catch (error) {
      console.error('Error in manageUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  manageOrders: async (req, res) => {
    try {
      const orders = await OrderModel.findAll();
      
      res.status(200).json({
        success: true,
        message: 'Admin order management',
        data: orders
      });
    } catch (error) {
      console.error('Error in manageOrders:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getAnalytics: async (req, res) => {
    try {
      const analyticsData = await AnalyticsModel.getAnalyticsData();
      
      const orders = await OrderModel.findAll();
      const salesByDate = {};
      
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!salesByDate[date]) {
          salesByDate[date] = {
            count: 0,
            revenue: 0
          };
        }
        salesByDate[date].count += 1;
        salesByDate[date].revenue += order.total_amount;
      });
      
      const salesData = Object.keys(salesByDate).map(date => ({
        date,
        count: salesByDate[date].count,
        revenue: salesByDate[date].revenue
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const products = await ProductModel.findAll();
      const popularProducts = products
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5);
      
      const users = await UserModel.findAll();
      const userOrderCounts = {};
      
      orders.forEach(order => {
        if (!userOrderCounts[order.user_id]) {
          userOrderCounts[order.user_id] = 0;
        }
        userOrderCounts[order.user_id] += 1;
      });
      
      const customerRetention = {
        oneTime: 0,
        repeat: 0,
        loyal: 0
      };
      
      Object.values(userOrderCounts).forEach(count => {
        if (count === 1) {
          customerRetention.oneTime += 1;
        } else if (count >= 2 && count <= 3) {
          customerRetention.repeat += 1;
        } else if (count > 3) {
          customerRetention.loyal += 1;
        }
      });
      
      const totalVisits = analyticsData?.totalVisits || users.length * 3; // Fallback estimate
      const conversionRate = orders.length / totalVisits;
      
      res.status(200).json({
        success: true,
        message: 'Admin analytics',
        data: {
          salesByDate: salesData,
          popularProducts,
          customerRetention,
          conversionRate: parseFloat(conversionRate.toFixed(4))
        }
      });
    } catch (error) {
      console.error('Error in getAnalytics:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = adminController;
