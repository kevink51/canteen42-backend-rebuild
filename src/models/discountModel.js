const { pgPool, inMemoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

if (!inMemoryStore.discounts) {
  inMemoryStore.discounts = {
    discounts: [],
    redemptions: []
  };
}

class DiscountModel {
  static async initTable() {
    try {
      if (!pgPool) {
        console.log('PostgreSQL not available, skipping table initialization');
        return false;
      }
      
      try {
        const discountTableQuery = `
          CREATE TABLE IF NOT EXISTS discounts (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
            trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('cart_total', 'item_quantity', 'user_role', 'product_combo', 'behavior_tag')),
            trigger_condition JSONB NOT NULL,
            discount_value NUMERIC(10, 2) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            usage_limit INTEGER,
            usage_count INTEGER DEFAULT 0,
            is_auto_apply BOOLEAN DEFAULT FALSE,
            coupon_code VARCHAR(50),
            priority INTEGER DEFAULT 0,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        const redemptionTableQuery = `
          CREATE TABLE IF NOT EXISTS discount_redemptions (
            id VARCHAR(50) PRIMARY KEY,
            discount_id VARCHAR(50) NOT NULL REFERENCES discounts(id),
            user_id VARCHAR(50),
            order_id VARCHAR(50),
            amount_saved NUMERIC(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            metadata JSONB
          )
        `;
        
        await pgPool.query(discountTableQuery);
        await pgPool.query(redemptionTableQuery);
        
        console.log('Discount tables initialized');
        return true;
      } catch (dbError) {
        console.warn('PostgreSQL table initialization error:', dbError.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing discount tables:', error);
      return false;
    }
  }
  
  static async findAll() {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT * FROM discounts ORDER BY priority DESC, created_at DESC';
          const result = await pgPool.query(query);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      return inMemoryStore.discounts.discounts;
    } catch (error) {
      console.error('Error finding all discounts:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT * FROM discounts WHERE id = $1';
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const discount = inMemoryStore.discounts.discounts.find(d => d.id === id);
      return discount || null;
    } catch (error) {
      console.error('Error finding discount by ID:', error);
      throw error;
    }
  }
  
  static async findByCouponCode(couponCode) {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT * FROM discounts WHERE coupon_code = $1 AND is_active = TRUE';
          const result = await pgPool.query(query, [couponCode]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const discount = inMemoryStore.discounts.discounts.find(
        d => d.couponCode === couponCode && d.isActive === true
      );
      return discount || null;
    } catch (error) {
      console.error('Error finding discount by coupon code:', error);
      throw error;
    }
  }
  
  static async create(discountData) {
    try {
      const {
        name,
        description,
        discountType,
        triggerType,
        triggerCondition,
        discountValue,
        isActive,
        usageLimit,
        isAutoApply,
        couponCode,
        priority,
        startDate,
        endDate
      } = discountData;
      
      const id = discountData.id || uuidv4();
      
      if (pgPool) {
        try {
          const query = `
            INSERT INTO discounts (
              id, name, description, discount_type, trigger_type, trigger_condition,
              discount_value, is_active, usage_limit, usage_count, is_auto_apply,
              coupon_code, priority, start_date, end_date, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
            RETURNING *
          `;
          
          const values = [
            id,
            name,
            description || '',
            discountType,
            triggerType,
            JSON.stringify(triggerCondition),
            discountValue,
            isActive !== undefined ? isActive : true,
            usageLimit || null,
            0, // Initial usage count
            isAutoApply !== undefined ? isAutoApply : false,
            couponCode || null,
            priority || 0,
            startDate || null,
            endDate || null
          ];
          
          const result = await pgPool.query(query, values);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newDiscount = {
        id,
        name,
        description: description || '',
        discountType,
        triggerType,
        triggerCondition,
        discountValue,
        isActive: isActive !== undefined ? isActive : true,
        usageLimit: usageLimit || null,
        usageCount: 0,
        isAutoApply: isAutoApply !== undefined ? isAutoApply : false,
        couponCode: couponCode || null,
        priority: priority || 0,
        startDate: startDate || null,
        endDate: endDate || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      inMemoryStore.discounts.discounts.push(newDiscount);
      return newDiscount;
    } catch (error) {
      console.error('Error creating discount:', error);
      throw error;
    }
  }
  
  static async update(id, discountData) {
    try {
      const {
        name,
        description,
        discountType,
        triggerType,
        triggerCondition,
        discountValue,
        isActive,
        usageLimit,
        isAutoApply,
        couponCode,
        priority,
        startDate,
        endDate
      } = discountData;
      
      if (pgPool) {
        try {
          const query = `
            UPDATE discounts
            SET 
              name = COALESCE($1, name),
              description = COALESCE($2, description),
              discount_type = COALESCE($3, discount_type),
              trigger_type = COALESCE($4, trigger_type),
              trigger_condition = COALESCE($5, trigger_condition),
              discount_value = COALESCE($6, discount_value),
              is_active = COALESCE($7, is_active),
              usage_limit = $8,
              is_auto_apply = COALESCE($9, is_auto_apply),
              coupon_code = $10,
              priority = COALESCE($11, priority),
              start_date = $12,
              end_date = $13,
              updated_at = NOW()
            WHERE id = $14
            RETURNING *
          `;
          
          const values = [
            name,
            description,
            discountType,
            triggerType,
            triggerCondition ? JSON.stringify(triggerCondition) : null,
            discountValue,
            isActive,
            usageLimit, // Can be set to null
            isAutoApply,
            couponCode, // Can be set to null
            priority,
            startDate, // Can be set to null
            endDate, // Can be set to null
            id
          ];
          
          const result = await pgPool.query(query, values);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const discountIndex = inMemoryStore.discounts.discounts.findIndex(d => d.id === id);
      
      if (discountIndex === -1) {
        return null;
      }
      
      const currentDiscount = inMemoryStore.discounts.discounts[discountIndex];
      
      const updatedDiscount = {
        ...currentDiscount,
        name: name !== undefined ? name : currentDiscount.name,
        description: description !== undefined ? description : currentDiscount.description,
        discountType: discountType !== undefined ? discountType : currentDiscount.discountType,
        triggerType: triggerType !== undefined ? triggerType : currentDiscount.triggerType,
        triggerCondition: triggerCondition !== undefined ? triggerCondition : currentDiscount.triggerCondition,
        discountValue: discountValue !== undefined ? discountValue : currentDiscount.discountValue,
        isActive: isActive !== undefined ? isActive : currentDiscount.isActive,
        usageLimit: usageLimit !== undefined ? usageLimit : currentDiscount.usageLimit,
        isAutoApply: isAutoApply !== undefined ? isAutoApply : currentDiscount.isAutoApply,
        couponCode: couponCode !== undefined ? couponCode : currentDiscount.couponCode,
        priority: priority !== undefined ? priority : currentDiscount.priority,
        startDate: startDate !== undefined ? startDate : currentDiscount.startDate,
        endDate: endDate !== undefined ? endDate : currentDiscount.endDate,
        updatedAt: new Date()
      };
      
      inMemoryStore.discounts.discounts[discountIndex] = updatedDiscount;
      return updatedDiscount;
    } catch (error) {
      console.error('Error updating discount:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      if (pgPool) {
        try {
          const checkQuery = 'SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = $1';
          const checkResult = await pgPool.query(checkQuery, [id]);
          
          if (parseInt(checkResult.rows[0].count) > 0) {
            const updateQuery = `
              UPDATE discounts
              SET is_active = FALSE, updated_at = NOW()
              WHERE id = $1
              RETURNING *
            `;
            
            const updateResult = await pgPool.query(updateQuery, [id]);
            
            if (updateResult.rows.length === 0) {
              return null;
            }
            
            return { ...updateResult.rows[0], _softDeleted: true };
          }
          
          const deleteQuery = 'DELETE FROM discounts WHERE id = $1 RETURNING *';
          const deleteResult = await pgPool.query(deleteQuery, [id]);
          
          if (deleteResult.rows.length === 0) {
            return null;
          }
          
          return deleteResult.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const discountIndex = inMemoryStore.discounts.discounts.findIndex(d => d.id === id);
      
      if (discountIndex === -1) {
        return null;
      }
      
      const hasRedemptions = inMemoryStore.discounts.redemptions.some(r => r.discountId === id);
      
      if (hasRedemptions) {
        const updatedDiscount = {
          ...inMemoryStore.discounts.discounts[discountIndex],
          isActive: false,
          updatedAt: new Date()
        };
        
        inMemoryStore.discounts.discounts[discountIndex] = updatedDiscount;
        return { ...updatedDiscount, _softDeleted: true };
      }
      
      const deletedDiscount = inMemoryStore.discounts.discounts[discountIndex];
      inMemoryStore.discounts.discounts.splice(discountIndex, 1);
      return deletedDiscount;
    } catch (error) {
      console.error('Error deleting discount:', error);
      throw error;
    }
  }
  
  static async incrementUsage(id) {
    try {
      if (pgPool) {
        try {
          const query = `
            UPDATE discounts
            SET usage_count = usage_count + 1, updated_at = NOW()
            WHERE id = $1
            RETURNING *
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
      
      const discountIndex = inMemoryStore.discounts.discounts.findIndex(d => d.id === id);
      
      if (discountIndex === -1) {
        return null;
      }
      
      const updatedDiscount = {
        ...inMemoryStore.discounts.discounts[discountIndex],
        usageCount: (inMemoryStore.discounts.discounts[discountIndex].usageCount || 0) + 1,
        updatedAt: new Date()
      };
      
      inMemoryStore.discounts.discounts[discountIndex] = updatedDiscount;
      return updatedDiscount;
    } catch (error) {
      console.error('Error incrementing discount usage:', error);
      throw error;
    }
  }
  
  static async recordRedemption(redemptionData) {
    try {
      const { discountId, userId, orderId, amountSaved, metadata } = redemptionData;
      const id = redemptionData.id || uuidv4();
      
      if (pgPool) {
        try {
          const query = `
            INSERT INTO discount_redemptions (
              id, discount_id, user_id, order_id, amount_saved, created_at, metadata
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            RETURNING *
          `;
          
          const values = [
            id,
            discountId,
            userId || null,
            orderId || null,
            amountSaved,
            metadata ? JSON.stringify(metadata) : null
          ];
          
          const result = await pgPool.query(query, values);
          
          await DiscountModel.incrementUsage(discountId);
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newRedemption = {
        id,
        discountId,
        userId: userId || null,
        orderId: orderId || null,
        amountSaved,
        createdAt: new Date(),
        metadata: metadata || null
      };
      
      inMemoryStore.discounts.redemptions.push(newRedemption);
      
      await DiscountModel.incrementUsage(discountId);
      
      return newRedemption;
    } catch (error) {
      console.error('Error recording discount redemption:', error);
      throw error;
    }
  }
  
  static async getRedemptionsByDiscountId(discountId) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT * FROM discount_redemptions
            WHERE discount_id = $1
            ORDER BY created_at DESC
          `;
          
          const result = await pgPool.query(query, [discountId]);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      return inMemoryStore.discounts.redemptions.filter(r => r.discountId === discountId);
    } catch (error) {
      console.error('Error getting redemptions by discount ID:', error);
      throw error;
    }
  }
  
  static async getRedemptionStats(discountId) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT 
              COUNT(*) as total_redemptions,
              SUM(amount_saved) as total_amount_saved,
              AVG(amount_saved) as average_amount_saved,
              MIN(created_at) as first_redemption,
              MAX(created_at) as last_redemption
            FROM discount_redemptions
            WHERE discount_id = $1
          `;
          
          const result = await pgPool.query(query, [discountId]);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const redemptions = inMemoryStore.discounts.redemptions.filter(r => r.discountId === discountId);
      
      if (redemptions.length === 0) {
        return {
          total_redemptions: 0,
          total_amount_saved: 0,
          average_amount_saved: 0,
          first_redemption: null,
          last_redemption: null
        };
      }
      
      const totalRedemptions = redemptions.length;
      const totalAmountSaved = redemptions.reduce((sum, r) => sum + r.amountSaved, 0);
      const averageAmountSaved = totalAmountSaved / totalRedemptions;
      const dates = redemptions.map(r => new Date(r.createdAt).getTime());
      const firstRedemption = new Date(Math.min(...dates));
      const lastRedemption = new Date(Math.max(...dates));
      
      return {
        total_redemptions: totalRedemptions,
        total_amount_saved: totalAmountSaved,
        average_amount_saved: averageAmountSaved,
        first_redemption: firstRedemption,
        last_redemption: lastRedemption
      };
    } catch (error) {
      console.error('Error getting redemption stats:', error);
      throw error;
    }
  }
  
  static async findEligibleDiscounts(cart, user, appliedCouponCode = null) {
    try {
      let discounts = [];
      
      if (pgPool) {
        try {
          const query = `
            SELECT * FROM discounts
            WHERE is_active = TRUE
            AND (usage_limit IS NULL OR usage_count < usage_limit)
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
            ORDER BY priority DESC, discount_value DESC
          `;
          
          const result = await pgPool.query(query);
          discounts = result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
          discounts = inMemoryStore.discounts.discounts.filter(d => 
            d.isActive === true && 
            (!d.usageLimit || d.usageCount < d.usageLimit) &&
            (!d.startDate || new Date(d.startDate) <= new Date()) &&
            (!d.endDate || new Date(d.endDate) >= new Date())
          );
        }
      } else {
        discounts = inMemoryStore.discounts.discounts.filter(d => 
          d.isActive === true && 
          (!d.usageLimit || d.usageCount < d.usageLimit) &&
          (!d.startDate || new Date(d.startDate) <= new Date()) &&
          (!d.endDate || new Date(d.endDate) >= new Date())
        );
      }
      
      if (appliedCouponCode) {
        const couponDiscount = discounts.find(d => 
          d.couponCode === appliedCouponCode && !d.isAutoApply
        );
        
        if (couponDiscount) {
          return [couponDiscount];
        } else {
          return []; // Invalid coupon code
        }
      }
      
      const autoApplyDiscounts = discounts.filter(d => d.isAutoApply === true);
      
      autoApplyDiscounts.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.discountValue - a.discountValue;
      });
      
      const eligibleDiscounts = [];
      
      for (const discount of autoApplyDiscounts) {
        try {
          const isEligible = DiscountModel.checkEligibility(discount, cart, user);
          if (isEligible) {
            eligibleDiscounts.push(discount);
          }
        } catch (error) {
          console.warn(`Error checking eligibility for discount ${discount.id}:`, error.message);
          continue;
        }
      }
      
      return eligibleDiscounts;
    } catch (error) {
      console.error('Error finding eligible discounts:', error);
      throw error;
    }
  }
  
  static checkEligibility(discount, cart, user) {
    try {
      const { triggerType, triggerCondition } = discount;
      
      switch (triggerType) {
        case 'cart_total':
          return DiscountModel.checkCartTotalEligibility(triggerCondition, cart);
          
        case 'item_quantity':
          return DiscountModel.checkItemQuantityEligibility(triggerCondition, cart);
          
        case 'user_role':
          return DiscountModel.checkUserRoleEligibility(triggerCondition, user);
          
        case 'product_combo':
          return DiscountModel.checkProductComboEligibility(triggerCondition, cart);
          
        case 'behavior_tag':
          return DiscountModel.checkBehaviorTagEligibility(triggerCondition, user);
          
        default:
          console.warn(`Unknown trigger type: ${triggerType}`);
          return false;
      }
    } catch (error) {
      console.error('Error checking discount eligibility:', error);
      return false;
    }
  }
  
  static checkCartTotalEligibility(condition, cart) {
    try {
      const { operator, value } = condition;
      const cartTotal = cart.totalAmount;
      
      switch (operator) {
        case 'gt':
          return cartTotal > value;
        case 'gte':
          return cartTotal >= value;
        case 'lt':
          return cartTotal < value;
        case 'lte':
          return cartTotal <= value;
        case 'eq':
          return cartTotal === value;
        default:
          console.warn(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      console.error('Error checking cart total eligibility:', error);
      return false;
    }
  }
  
  static checkItemQuantityEligibility(condition, cart) {
    try {
      const { productId, operator, quantity } = condition;
      
      if (productId) {
        const productItem = cart.products.find(item => item.productId === productId);
        const productQuantity = productItem ? productItem.quantity : 0;
        
        switch (operator) {
          case 'gt':
            return productQuantity > quantity;
          case 'gte':
            return productQuantity >= quantity;
          case 'lt':
            return productQuantity < quantity;
          case 'lte':
            return productQuantity <= quantity;
          case 'eq':
            return productQuantity === quantity;
          default:
            console.warn(`Unknown operator: ${operator}`);
            return false;
        }
      } 
      
      const totalQuantity = cart.products.reduce((sum, item) => sum + item.quantity, 0);
      
      switch (operator) {
        case 'gt':
          return totalQuantity > quantity;
        case 'gte':
          return totalQuantity >= quantity;
        case 'lt':
          return totalQuantity < quantity;
        case 'lte':
          return totalQuantity <= quantity;
        case 'eq':
          return totalQuantity === quantity;
        default:
          console.warn(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      console.error('Error checking item quantity eligibility:', error);
      return false;
    }
  }
  
  static checkUserRoleEligibility(condition, user) {
    try {
      const { roles } = condition;
      
      if (!user || !user.role) {
        return false;
      }
      
      return roles.includes(user.role);
    } catch (error) {
      console.error('Error checking user role eligibility:', error);
      return false;
    }
  }
  
  static checkProductComboEligibility(condition, cart) {
    try {
      const { requiredProducts, operator } = condition;
      
      if (!cart.products || cart.products.length === 0) {
        return false;
      }
      
      const cartProductIds = cart.products.map(item => item.productId);
      
      switch (operator) {
        case 'all':
          return requiredProducts.every(productId => cartProductIds.includes(productId));
        case 'any':
          return requiredProducts.some(productId => cartProductIds.includes(productId));
        default:
          console.warn(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      console.error('Error checking product combo eligibility:', error);
      return false;
    }
  }
  
  static checkBehaviorTagEligibility(condition, user) {
    try {
      const { tag, minCount } = condition;
      
      if (!user || !user.id) {
        return false;
      }
      
      console.log(`Checking behavior tag '${tag}' for user ${user.id} (min count: ${minCount})`);
      return false;
    } catch (error) {
      console.error('Error checking behavior tag eligibility:', error);
      return false;
    }
  }
  
  static calculateDiscount(discount, cart) {
    try {
      const { discountType, discountValue } = discount;
      
      switch (discountType) {
        case 'fixed':
          return Math.min(discountValue, cart.totalAmount);
          
        case 'percentage':
          return (discountValue / 100) * cart.totalAmount;
          
        default:
          console.warn(`Unknown discount type: ${discountType}`);
          return 0;
      }
    } catch (error) {
      console.error('Error calculating discount:', error);
      return 0;
    }
  }
}

module.exports = DiscountModel;
