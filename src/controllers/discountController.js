const DiscountModel = require('../models/discountModel');

const discountController = {
  /**
   * Get all discounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllDiscounts: async (req, res) => {
    try {
      const discounts = await DiscountModel.findAll();
      res.status(200).json({
        success: true,
        count: discounts.length,
        data: discounts
      });
    } catch (error) {
      console.error('Error getting all discounts:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving discounts',
        error: error.message
      });
    }
  },
  
  /**
   * Get discount by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getDiscountById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const discount = await DiscountModel.findById(id);
      
      if (!discount) {
        return res.status(404).json({
          success: false,
          message: `Discount with ID ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        data: discount
      });
    } catch (error) {
      console.error('Error getting discount by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving discount',
        error: error.message
      });
    }
  },
  
  /**
   * Create a new discount
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createDiscount: async (req, res) => {
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
      } = req.body;
      
      if (!name || !discountType || !triggerType || !triggerCondition || discountValue === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, discountType, triggerType, triggerCondition, and discountValue are required'
        });
      }
      
      if (!['fixed', 'percentage'].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount type. Must be "fixed" or "percentage"'
        });
      }
      
      if (!['cart_total', 'item_quantity', 'user_role', 'product_combo', 'behavior_tag'].includes(triggerType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trigger type. Must be one of: cart_total, item_quantity, user_role, product_combo, behavior_tag'
        });
      }
      
      if (!validateTriggerCondition(triggerType, triggerCondition)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trigger condition for the specified trigger type'
        });
      }
      
      if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount value must be between 0 and 100'
        });
      } else if (discountType === 'fixed' && discountValue <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Fixed discount value must be greater than 0'
        });
      }
      
      if (couponCode) {
        const existingDiscount = await DiscountModel.findByCouponCode(couponCode);
        if (existingDiscount) {
          return res.status(400).json({
            success: false,
            message: `Coupon code "${couponCode}" is already in use`
          });
        }
      }
      
      const discount = await DiscountModel.create({
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
      });
      
      res.status(201).json({
        success: true,
        message: 'Discount created successfully',
        data: discount
      });
    } catch (error) {
      console.error('Error creating discount:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating discount',
        error: error.message
      });
    }
  },
  
  /**
   * Update a discount
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateDiscount: async (req, res) => {
    try {
      const { id } = req.params;
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
      } = req.body;
      
      const existingDiscount = await DiscountModel.findById(id);
      
      if (!existingDiscount) {
        return res.status(404).json({
          success: false,
          message: `Discount with ID ${id} not found`
        });
      }
      
      if (discountType && !['fixed', 'percentage'].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount type. Must be "fixed" or "percentage"'
        });
      }
      
      if (triggerType && !['cart_total', 'item_quantity', 'user_role', 'product_combo', 'behavior_tag'].includes(triggerType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trigger type. Must be one of: cart_total, item_quantity, user_role, product_combo, behavior_tag'
        });
      }
      
      if (triggerType && triggerCondition && !validateTriggerCondition(triggerType, triggerCondition)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trigger condition for the specified trigger type'
        });
      }
      
      if (discountValue !== undefined) {
        const type = discountType || existingDiscount.discountType;
        
        if (type === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
          return res.status(400).json({
            success: false,
            message: 'Percentage discount value must be between 0 and 100'
          });
        } else if (type === 'fixed' && discountValue <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Fixed discount value must be greater than 0'
          });
        }
      }
      
      if (couponCode && couponCode !== existingDiscount.couponCode) {
        const existingCoupon = await DiscountModel.findByCouponCode(couponCode);
        if (existingCoupon) {
          return res.status(400).json({
            success: false,
            message: `Coupon code "${couponCode}" is already in use`
          });
        }
      }
      
      const updatedDiscount = await DiscountModel.update(id, {
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
      });
      
      res.status(200).json({
        success: true,
        message: 'Discount updated successfully',
        data: updatedDiscount
      });
    } catch (error) {
      console.error('Error updating discount:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating discount',
        error: error.message
      });
    }
  },
  
  /**
   * Delete a discount
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  deleteDiscount: async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingDiscount = await DiscountModel.findById(id);
      
      if (!existingDiscount) {
        return res.status(404).json({
          success: false,
          message: `Discount with ID ${id} not found`
        });
      }
      
      const deletedDiscount = await DiscountModel.delete(id);
      
      if (deletedDiscount._softDeleted) {
        return res.status(200).json({
          success: true,
          message: 'Discount has been deactivated because it has been used in orders',
          data: deletedDiscount
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Discount deleted successfully',
        data: deletedDiscount
      });
    } catch (error) {
      console.error('Error deleting discount:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting discount',
        error: error.message
      });
    }
  },
  
  /**
   * Get redemption statistics for a discount
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getDiscountStats: async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingDiscount = await DiscountModel.findById(id);
      
      if (!existingDiscount) {
        return res.status(404).json({
          success: false,
          message: `Discount with ID ${id} not found`
        });
      }
      
      const stats = await DiscountModel.getRedemptionStats(id);
      
      res.status(200).json({
        success: true,
        data: {
          discount: existingDiscount,
          stats
        }
      });
    } catch (error) {
      console.error('Error getting discount stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving discount statistics',
        error: error.message
      });
    }
  },
  
  /**
   * Get redemptions for a discount
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getDiscountRedemptions: async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingDiscount = await DiscountModel.findById(id);
      
      if (!existingDiscount) {
        return res.status(404).json({
          success: false,
          message: `Discount with ID ${id} not found`
        });
      }
      
      const redemptions = await DiscountModel.getRedemptionsByDiscountId(id);
      
      res.status(200).json({
        success: true,
        count: redemptions.length,
        data: redemptions
      });
    } catch (error) {
      console.error('Error getting discount redemptions:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving discount redemptions',
        error: error.message
      });
    }
  },
  
  /**
   * Apply discount to cart
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  applyDiscount: async (req, res) => {
    try {
      const { cart, couponCode } = req.body;
      const user = req.user;
      
      if (!cart || !cart.products || !cart.totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cart data. Must include products and totalAmount'
        });
      }
      
      let eligibleDiscounts = [];
      
      if (couponCode) {
        const couponDiscount = await DiscountModel.findByCouponCode(couponCode);
        
        if (!couponDiscount) {
          return res.status(404).json({
            success: false,
            message: `Coupon code "${couponCode}" is invalid or expired`
          });
        }
        
        const isEligible = DiscountModel.checkEligibility(couponDiscount, cart, user);
        
        if (!isEligible) {
          return res.status(400).json({
            success: false,
            message: `Coupon code "${couponCode}" is not applicable to this cart`
          });
        }
        
        eligibleDiscounts = [couponDiscount];
      } else {
        eligibleDiscounts = await DiscountModel.findEligibleDiscounts(cart, user);
      }
      
      if (eligibleDiscounts.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No eligible discounts found for this cart',
          data: {
            originalAmount: cart.totalAmount,
            discountAmount: 0,
            finalAmount: cart.totalAmount,
            appliedDiscount: null
          }
        });
      }
      
      eligibleDiscounts.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        
        const aAmount = DiscountModel.calculateDiscount(a, cart);
        const bAmount = DiscountModel.calculateDiscount(b, cart);
        
        return bAmount - aAmount;
      });
      
      const bestDiscount = eligibleDiscounts[0];
      const discountAmount = DiscountModel.calculateDiscount(bestDiscount, cart);
      const finalAmount = cart.totalAmount - discountAmount;
      
      res.status(200).json({
        success: true,
        message: 'Discount applied successfully',
        data: {
          originalAmount: cart.totalAmount,
          discountAmount,
          finalAmount,
          appliedDiscount: bestDiscount
        }
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying discount',
        error: error.message
      });
    }
  },
  
  /**
   * Record a discount redemption
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  recordRedemption: async (req, res) => {
    try {
      const { discountId, orderId, amountSaved, metadata } = req.body;
      const userId = req.user ? req.user.id : null;
      
      if (!discountId || !amountSaved) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: discountId and amountSaved are required'
        });
      }
      
      const existingDiscount = await DiscountModel.findById(discountId);
      
      if (!existingDiscount) {
        return res.status(404).json({
          success: false,
          message: `Discount with ID ${discountId} not found`
        });
      }
      
      const redemption = await DiscountModel.recordRedemption({
        discountId,
        userId,
        orderId,
        amountSaved,
        metadata
      });
      
      res.status(201).json({
        success: true,
        message: 'Discount redemption recorded successfully',
        data: redemption
      });
    } catch (error) {
      console.error('Error recording discount redemption:', error);
      res.status(500).json({
        success: false,
        message: 'Error recording discount redemption',
        error: error.message
      });
    }
  }
};

/**
 * Validate trigger condition based on trigger type
 * @param {string} triggerType - Type of trigger
 * @param {Object} condition - Trigger condition
 * @returns {boolean} - Whether the condition is valid
 */
function validateTriggerCondition(triggerType, condition) {
  try {
    switch (triggerType) {
      case 'cart_total':
        return (
          condition &&
          condition.operator &&
          ['gt', 'gte', 'lt', 'lte', 'eq'].includes(condition.operator) &&
          condition.value !== undefined &&
          condition.value >= 0
        );
        
      case 'item_quantity':
        return (
          condition &&
          condition.operator &&
          ['gt', 'gte', 'lt', 'lte', 'eq'].includes(condition.operator) &&
          condition.quantity !== undefined &&
          condition.quantity >= 0
        );
        
      case 'user_role':
        return (
          condition &&
          Array.isArray(condition.roles) &&
          condition.roles.length > 0
        );
        
      case 'product_combo':
        return (
          condition &&
          Array.isArray(condition.requiredProducts) &&
          condition.requiredProducts.length > 0 &&
          condition.operator &&
          ['all', 'any'].includes(condition.operator)
        );
        
      case 'behavior_tag':
        return (
          condition &&
          condition.tag &&
          typeof condition.tag === 'string' &&
          condition.minCount !== undefined &&
          condition.minCount >= 1
        );
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Error validating trigger condition:', error);
    return false;
  }
}

module.exports = discountController;
