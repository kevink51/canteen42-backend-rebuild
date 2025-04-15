const EmailTemplateModel = require('../models/emailTemplateModel');
const { sendEmail } = require('../utils/emailService');
const ProductModel = require('../models/productModel');
const UserModel = require('../models/userModel');

const emailController = {
  getAllTemplates: async (req, res) => {
    try {
      const templates = await EmailTemplateModel.findAll();
      
      res.status(200).json({
        success: true,
        count: templates.length,
        data: templates
      });
    } catch (error) {
      console.error('Error in getAllTemplates:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getTemplateById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await EmailTemplateModel.findById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Email template not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  createTemplate: async (req, res) => {
    try {
      const { id, name, subject, body, isEnabled, delayMinutes } = req.body;
      
      if (!id || !name || !subject || !body) {
        return res.status(400).json({
          success: false,
          message: 'Please provide id, name, subject, and body'
        });
      }
      
      const existingTemplate = await EmailTemplateModel.findById(id);
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Email template with this ID already exists'
        });
      }
      
      const template = await EmailTemplateModel.create({
        id,
        name,
        subject,
        body,
        isEnabled,
        delayMinutes
      });
      
      res.status(201).json({
        success: true,
        message: 'Email template created successfully',
        data: template
      });
    } catch (error) {
      console.error('Error in createTemplate:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, subject, body, isEnabled, delayMinutes } = req.body;
      
      if (!name && !subject && !body && isEnabled === undefined && delayMinutes === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least one field to update'
        });
      }
      
      const template = await EmailTemplateModel.findById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Email template not found'
        });
      }
      
      const updatedTemplate = await EmailTemplateModel.update(id, {
        name,
        subject,
        body,
        isEnabled,
        delayMinutes
      });
      
      res.status(200).json({
        success: true,
        message: 'Email template updated successfully',
        data: updatedTemplate
      });
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await EmailTemplateModel.findById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Email template not found'
        });
      }
      
      await EmailTemplateModel.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Email template deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  triggerNotifyMeEmail: async (req, res) => {
    try {
      const { userId, productId, email } = req.body;
      
      if (!userId || !productId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and product ID are required'
        });
      }
      
      const template = await EmailTemplateModel.findById('notify-me');
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Notify Me email template not found'
        });
      }
      
      if (!template.isEnabled) {
        return res.status(200).json({
          success: true,
          message: 'Notify Me emails are currently disabled',
          emailSent: false
        });
      }
      
      const [user, product] = await Promise.all([
        UserModel.findById(userId),
        ProductModel.findById(productId)
      ]);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const subject = template.subject
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      const body = template.body
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      const emailResult = await sendEmail(
        email || user.email,
        subject,
        body
      );
      
      res.status(200).json({
        success: true,
        message: emailResult.success ? 'Notify Me email sent successfully' : 'Failed to send Notify Me email',
        emailSent: emailResult.success
      });
    } catch (error) {
      console.error('Error in triggerNotifyMeEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  triggerFavoriteEmail: async (req, res) => {
    try {
      const { userId, productId } = req.body;
      
      if (!userId || !productId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and product ID are required'
        });
      }
      
      const template = await EmailTemplateModel.findById('favorite');
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Favorite email template not found'
        });
      }
      
      if (!template.isEnabled) {
        return res.status(200).json({
          success: true,
          message: 'Favorite emails are currently disabled',
          emailSent: false
        });
      }
      
      const [user, product] = await Promise.all([
        UserModel.findById(userId),
        ProductModel.findById(productId)
      ]);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const subject = template.subject
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      const body = template.body
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      const emailResult = await sendEmail(
        user.email,
        subject,
        body
      );
      
      res.status(200).json({
        success: true,
        message: emailResult.success ? 'Favorite email sent successfully' : 'Failed to send Favorite email',
        emailSent: emailResult.success
      });
    } catch (error) {
      console.error('Error in triggerFavoriteEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  triggerCartAbandonmentEmail: async (req, res) => {
    try {
      const { userId, cartItems, cartTotal, checkoutLink } = req.body;
      
      if (!userId || !cartItems || !cartTotal) {
        return res.status(400).json({
          success: false,
          message: 'User ID, cart items, and cart total are required'
        });
      }
      
      const template = await EmailTemplateModel.findById('cart-abandonment');
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Cart abandonment email template not found'
        });
      }
      
      if (!template.isEnabled) {
        return res.status(200).json({
          success: true,
          message: 'Cart abandonment emails are currently disabled',
          emailSent: false
        });
      }
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      let formattedCartItems = '';
      for (const item of cartItems) {
        const product = await ProductModel.findById(item.productId);
        if (product) {
          formattedCartItems += `- ${product.title} x ${item.quantity} - $${(product.price * item.quantity).toFixed(2)}\n`;
        }
      }
      
      const subject = template.subject
        .replace(/{{user_name}}/g, user.name);
      
      const body = template.body
        .replace(/{{user_name}}/g, user.name)
        .replace(/{{cart_items}}/g, formattedCartItems)
        .replace(/{{cart_total}}/g, `$${parseFloat(cartTotal).toFixed(2)}`)
        .replace(/{{checkout_link}}/g, checkoutLink || 'https://canteen42.com/checkout');
      
      const emailResult = await sendEmail(
        user.email,
        subject,
        body
      );
      
      res.status(200).json({
        success: true,
        message: emailResult.success ? 'Cart abandonment email sent successfully' : 'Failed to send cart abandonment email',
        emailSent: emailResult.success
      });
    } catch (error) {
      console.error('Error in triggerCartAbandonmentEmail:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  handleNotifyMeEvent: async (userId, productId, email) => {
    try {
      const template = await EmailTemplateModel.findById('notify-me');
      
      if (!template || !template.isEnabled) {
        console.log('Notify Me email is disabled or template not found');
        return { success: false, message: 'Email disabled or template not found' };
      }
      
      const [user, product] = await Promise.all([
        UserModel.findById(userId),
        ProductModel.findById(productId)
      ]);
      
      if (!user || !product) {
        console.log('User or product not found for Notify Me email');
        return { success: false, message: 'User or product not found' };
      }
      
      const subject = template.subject
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      const body = template.body
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      if (template.delayMinutes > 0) {
        setTimeout(async () => {
          await sendEmail(email || user.email, subject, body);
        }, template.delayMinutes * 60 * 1000);
        
        return { success: true, message: 'Notify Me email scheduled' };
      } else {
        const result = await sendEmail(email || user.email, subject, body);
        return { success: result.success, message: result.message };
      }
    } catch (error) {
      console.error('Error in handleNotifyMeEvent:', error);
      return { success: false, message: error.message };
    }
  },
  
  handleFavoriteEvent: async (userId, productId) => {
    try {
      const template = await EmailTemplateModel.findById('favorite');
      
      if (!template || !template.isEnabled) {
        console.log('Favorite email is disabled or template not found');
        return { success: false, message: 'Email disabled or template not found' };
      }
      
      const [user, product] = await Promise.all([
        UserModel.findById(userId),
        ProductModel.findById(productId)
      ]);
      
      if (!user || !product) {
        console.log('User or product not found for Favorite email');
        return { success: false, message: 'User or product not found' };
      }
      
      const subject = template.subject
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      const body = template.body
        .replace(/{{product_name}}/g, product.title)
        .replace(/{{user_name}}/g, user.name);
      
      if (template.delayMinutes > 0) {
        setTimeout(async () => {
          await sendEmail(user.email, subject, body);
        }, template.delayMinutes * 60 * 1000);
        
        return { success: true, message: 'Favorite email scheduled' };
      } else {
        const result = await sendEmail(user.email, subject, body);
        return { success: result.success, message: result.message };
      }
    } catch (error) {
      console.error('Error in handleFavoriteEvent:', error);
      return { success: false, message: error.message };
    }
  },
  
  handleCartAbandonmentEvent: async (userId, cartItems, cartTotal, checkoutLink) => {
    try {
      const template = await EmailTemplateModel.findById('cart-abandonment');
      
      if (!template || !template.isEnabled) {
        console.log('Cart abandonment email is disabled or template not found');
        return { success: false, message: 'Email disabled or template not found' };
      }
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        console.log('User not found for Cart abandonment email');
        return { success: false, message: 'User not found' };
      }
      
      let formattedCartItems = '';
      for (const item of cartItems) {
        const product = await ProductModel.findById(item.productId);
        if (product) {
          formattedCartItems += `- ${product.title} x ${item.quantity} - $${(product.price * item.quantity).toFixed(2)}\n`;
        }
      }
      
      const subject = template.subject
        .replace(/{{user_name}}/g, user.name);
      
      const body = template.body
        .replace(/{{user_name}}/g, user.name)
        .replace(/{{cart_items}}/g, formattedCartItems)
        .replace(/{{cart_total}}/g, `$${parseFloat(cartTotal).toFixed(2)}`)
        .replace(/{{checkout_link}}/g, checkoutLink || 'https://canteen42.com/checkout');
      
      const delayMinutes = template.delayMinutes || 120;
      
      setTimeout(async () => {
        await sendEmail(user.email, subject, body);
      }, delayMinutes * 60 * 1000);
      
      return { success: true, message: 'Cart abandonment email scheduled' };
    } catch (error) {
      console.error('Error in handleCartAbandonmentEvent:', error);
      return { success: false, message: error.message };
    }
  }
};

module.exports = emailController;
