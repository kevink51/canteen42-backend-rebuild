const { pgPool, inMemoryStore } = require('../config/db');

if (!inMemoryStore.analytics) {
  inMemoryStore.analytics = {
    userEvents: [],
    favorites: [],
    notifyMe: [],
    cartAbandonment: []
  };
}

class AnalyticsModel {
  static async getUserStats() {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT COUNT(*) as total FROM users';
          const result = await pgPool.query(query);
          return { totalUsers: parseInt(result.rows[0].total) || 0 };
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const UserModel = require('./userModel');
      const users = await UserModel.findAll();
      return { totalUsers: users.length };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
  
  static async getProductStats() {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT COUNT(*) as total FROM products';
          const result = await pgPool.query(query);
          return { totalProducts: parseInt(result.rows[0].total) || 0 };
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const ProductModel = require('./productModel');
      const products = await ProductModel.findAll();
      return { totalProducts: products.length };
    } catch (error) {
      console.error('Error getting product stats:', error);
      throw error;
    }
  }
  
  static async getOrderStats() {
    try {
      if (pgPool) {
        try {
          const countQuery = 'SELECT COUNT(*) as total FROM orders';
          const countResult = await pgPool.query(countQuery);
          
          const revenueQuery = `
            SELECT SUM(total_amount) as revenue 
            FROM orders 
            WHERE status = 'delivered'
          `;
          const revenueResult = await pgPool.query(revenueQuery);
          
          return {
            totalOrders: parseInt(countResult.rows[0].total) || 0,
            totalRevenue: parseFloat(revenueResult.rows[0].revenue) || 0
          };
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const OrderModel = require('./orderModel');
      const orders = await OrderModel.findAll();
      const completedOrders = orders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
      
      return {
        totalOrders: orders.length,
        totalRevenue: totalRevenue
      };
    } catch (error) {
      console.error('Error getting order stats:', error);
      throw error;
    }
  }
  
  static async logUserEvent(eventData) {
    try {
      const { userId, eventType, productId, metadata } = eventData;
      const timestamp = new Date();
      
      if (pgPool) {
        try {
          const query = `
            INSERT INTO user_events (user_id, event_type, product_id, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, event_type, product_id, metadata, created_at
          `;
          
          const values = [
            userId,
            eventType,
            productId,
            JSON.stringify(metadata || {}),
            timestamp
          ];
          
          const result = await pgPool.query(query, values);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newEvent = {
        id: Date.now().toString(),
        userId,
        eventType,
        productId,
        metadata: metadata || {},
        created_at: timestamp
      };
      
      inMemoryStore.analytics.userEvents.push(newEvent);
      
      if (eventType === 'favorite') {
        inMemoryStore.analytics.favorites.push({
          id: Date.now().toString(),
          userId,
          productId,
          created_at: timestamp
        });
      } else if (eventType === 'notify_me') {
        inMemoryStore.analytics.notifyMe.push({
          id: Date.now().toString(),
          userId,
          productId,
          created_at: timestamp
        });
      } else if (eventType === 'cart_abandonment') {
        inMemoryStore.analytics.cartAbandonment.push({
          id: Date.now().toString(),
          userId,
          products: metadata.products || [],
          totalAmount: metadata.totalAmount || 0,
          created_at: timestamp
        });
      }
      
      return newEvent;
    } catch (error) {
      console.error('Error logging user event:', error);
      throw error;
    }
  }
  
  static async getTopFavoritedProducts(limit = 10) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT product_id, COUNT(*) as favorite_count
            FROM user_events
            WHERE event_type = 'favorite'
            GROUP BY product_id
            ORDER BY favorite_count DESC
            LIMIT $1
          `;
          
          const result = await pgPool.query(query, [limit]);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const favorites = inMemoryStore.analytics.favorites;
      
      const productCounts = {};
      favorites.forEach(fav => {
        productCounts[fav.productId] = (productCounts[fav.productId] || 0) + 1;
      });
      
      const topProducts = Object.entries(productCounts)
        .map(([productId, favorite_count]) => ({ productId, favorite_count }))
        .sort((a, b) => b.favorite_count - a.favorite_count)
        .slice(0, limit);
      
      return topProducts;
    } catch (error) {
      console.error('Error getting top favorited products:', error);
      throw error;
    }
  }
  
  static async getTopNotifyMeProducts(limit = 10) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT product_id, COUNT(*) as notify_count
            FROM user_events
            WHERE event_type = 'notify_me'
            GROUP BY product_id
            ORDER BY notify_count DESC
            LIMIT $1
          `;
          
          const result = await pgPool.query(query, [limit]);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const notifyMe = inMemoryStore.analytics.notifyMe;
      
      const productCounts = {};
      notifyMe.forEach(item => {
        productCounts[item.productId] = (productCounts[item.productId] || 0) + 1;
      });
      
      const topProducts = Object.entries(productCounts)
        .map(([productId, notify_count]) => ({ productId, notify_count }))
        .sort((a, b) => b.notify_count - a.notify_count)
        .slice(0, limit);
      
      return topProducts;
    } catch (error) {
      console.error('Error getting top notify me products:', error);
      throw error;
    }
  }
  
  static async getRecentCartAbandonment(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      if (pgPool) {
        try {
          const query = `
            SELECT COUNT(*) as count
            FROM user_events
            WHERE event_type = 'cart_abandonment'
            AND created_at >= $1
          `;
          
          const result = await pgPool.query(query, [cutoffTime]);
          return {
            count: parseInt(result.rows[0].count) || 0,
            timeframe: `${hours}h`
          };
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const abandonments = inMemoryStore.analytics.cartAbandonment;
      const recentAbandonment = abandonments.filter(item => 
        new Date(item.created_at) >= cutoffTime
      );
      
      return {
        count: recentAbandonment.length,
        timeframe: `${hours}h`
      };
    } catch (error) {
      console.error('Error getting recent cart abandonment:', error);
      throw error;
    }
  }
  
  static async initTable() {
    try {
      if (!pgPool) {
        console.log('PostgreSQL not available, skipping table initialization');
        return false;
      }
      
      try {
        const userEventsQuery = `
          CREATE TABLE IF NOT EXISTS user_events (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            product_id VARCHAR(255),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        await pgPool.query(userEventsQuery);
        console.log('User events table initialized');
        
        return true;
      } catch (dbError) {
        console.warn('PostgreSQL table initialization error:', dbError.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing analytics tables:', error);
      return false;
    }
  }
}

module.exports = AnalyticsModel;
