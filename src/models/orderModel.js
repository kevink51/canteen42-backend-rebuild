const { pgPool, inMemoryStore } = require('../config/db');

if (!inMemoryStore.orders) {
  inMemoryStore.orders = [];
}

class OrderModel {
  static async create(orderData) {
    try {
      const { userId, products, totalAmount, status, stripePaymentId } = orderData;
      
      if (pgPool) {
        try {
          const query = `
            INSERT INTO orders (
              user_id, 
              products, 
              total_amount, 
              status, 
              stripe_payment_id, 
              created_at, 
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at
          `;
          
          const values = [
            userId, 
            JSON.stringify(products), 
            totalAmount, 
            status || 'pending', 
            stripePaymentId
          ];
          
          const result = await pgPool.query(query, values);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newOrder = {
        id: Date.now().toString(),
        userId,
        products,
        totalAmount,
        status: status || 'pending',
        stripePaymentId,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      inMemoryStore.orders.push(newOrder);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
  
  static async findAll(filters = {}) {
    try {
      if (pgPool) {
        try {
          let query = `
            SELECT id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at
            FROM orders
          `;
          
          const values = [];
          const conditions = [];
          let paramIndex = 1;
          
          if (filters.userId) {
            conditions.push(`user_id = $${paramIndex}`);
            values.push(filters.userId);
            paramIndex++;
          }
          
          if (filters.status) {
            conditions.push(`status = $${paramIndex}`);
            values.push(filters.status);
            paramIndex++;
          }
          
          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }
          
          query += ' ORDER BY created_at DESC';
          
          const result = await pgPool.query(query, values);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      let orders = [...inMemoryStore.orders];
      
      if (filters.userId) {
        orders = orders.filter(order => order.userId === filters.userId);
      }
      
      if (filters.status) {
        orders = orders.filter(order => order.status === filters.status);
      }
      
      return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error finding orders:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at
            FROM orders
            WHERE id = $1
          `;
          
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const order = inMemoryStore.orders.find(o => o.id === id);
      return order || null;
    } catch (error) {
      console.error('Error finding order by ID:', error);
      throw error;
    }
  }
  
  static async findByUserId(userId) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
          `;
          
          const result = await pgPool.query(query, [userId]);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const orders = inMemoryStore.orders.filter(order => order.userId === userId);
      return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error finding orders by user ID:', error);
      throw error;
    }
  }
  
  static async update(id, updateData) {
    try {
      const { products, totalAmount, status, stripePaymentId } = updateData;
      
      if (pgPool) {
        try {
          let query = 'UPDATE orders SET ';
          const values = [];
          const updates = [];
          let paramIndex = 1;
          
          if (products !== undefined) {
            updates.push(`products = $${paramIndex}`);
            values.push(JSON.stringify(products));
            paramIndex++;
          }
          
          if (totalAmount !== undefined) {
            updates.push(`total_amount = $${paramIndex}`);
            values.push(totalAmount);
            paramIndex++;
          }
          
          if (status !== undefined) {
            updates.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
          }
          
          if (stripePaymentId !== undefined) {
            updates.push(`stripe_payment_id = $${paramIndex}`);
            values.push(stripePaymentId);
            paramIndex++;
          }
          
          updates.push(`updated_at = NOW()`);
          
          query += updates.join(', ');
          query += ` WHERE id = $${paramIndex} RETURNING id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at`;
          
          values.push(id);
          
          const result = await pgPool.query(query, values);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const index = inMemoryStore.orders.findIndex(o => o.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const updatedOrder = { ...inMemoryStore.orders[index] };
      
      if (products !== undefined) updatedOrder.products = products;
      if (totalAmount !== undefined) updatedOrder.totalAmount = totalAmount;
      if (status !== undefined) updatedOrder.status = status;
      if (stripePaymentId !== undefined) updatedOrder.stripePaymentId = stripePaymentId;
      
      updatedOrder.updated_at = new Date();
      
      inMemoryStore.orders[index] = updatedOrder;
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }
  
  static async updateStatus(id, status) {
    try {
      if (pgPool) {
        try {
          const query = `
            UPDATE orders
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at
          `;
          
          const result = await pgPool.query(query, [status, id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const index = inMemoryStore.orders.findIndex(o => o.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const updatedOrder = { ...inMemoryStore.orders[index], status, updated_at: new Date() };
      inMemoryStore.orders[index] = updatedOrder;
      
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      if (pgPool) {
        try {
          const query = `
            DELETE FROM orders
            WHERE id = $1
            RETURNING id, user_id, products, total_amount, status, stripe_payment_id, created_at, updated_at
          `;
          
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const index = inMemoryStore.orders.findIndex(o => o.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const deletedOrder = inMemoryStore.orders[index];
      inMemoryStore.orders.splice(index, 1);
      
      return deletedOrder;
    } catch (error) {
      console.error('Error deleting order:', error);
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
        const query = `
          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            products JSONB NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            stripe_payment_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        await pgPool.query(query);
        console.log('Orders table initialized');
        
        return true;
      } catch (dbError) {
        console.warn('PostgreSQL table initialization error:', dbError.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing orders table:', error);
      return false;
    }
  }
}

module.exports = OrderModel;
