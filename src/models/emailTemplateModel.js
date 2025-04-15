const { pgPool, inMemoryStore } = require('../config/db');

if (!inMemoryStore.emailTemplates) {
  inMemoryStore.emailTemplates = {
    templates: [
      {
        id: 'notify-me',
        name: 'Notify Me',
        subject: 'We\'ll notify you when {{product_name}} is available',
        body: 'Hello {{user_name}},\n\nThank you for your interest in {{product_name}}. We\'ll notify you as soon as it becomes available.\n\nBest regards,\nThe CANTEEN42 Team',
        isEnabled: true,
        delayMinutes: 0,
        lastUpdated: new Date()
      },
      {
        id: 'favorite',
        name: 'Product Favorited',
        subject: 'You favorited {{product_name}} — now 10% off!',
        body: 'Hello {{user_name}},\n\nWe noticed you favorited {{product_name}}. As a thank you, we\'re offering you a special 10% discount on this product.\n\nUse code: FAVORITE10\n\nBest regards,\nThe CANTEEN42 Team',
        isEnabled: true,
        delayMinutes: 0,
        lastUpdated: new Date()
      },
      {
        id: 'cart-abandonment',
        name: 'Cart Abandonment',
        subject: 'You left something behind in your cart',
        body: 'Hello {{user_name}},\n\nWe noticed you left some items in your cart. Your cart contains:\n\n{{cart_items}}\n\nTotal: {{cart_total}}\n\nClick here to complete your purchase: {{checkout_link}}\n\nBest regards,\nThe CANTEEN42 Team',
        isEnabled: true,
        delayMinutes: 120, // 2 hours
        lastUpdated: new Date()
      }
    ]
  };
}

class EmailTemplateModel {
  static async findAll() {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT * FROM email_templates ORDER BY name';
          const result = await pgPool.query(query);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      return inMemoryStore.emailTemplates.templates;
    } catch (error) {
      console.error('Error finding all email templates:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT * FROM email_templates WHERE id = $1';
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const template = inMemoryStore.emailTemplates.templates.find(t => t.id === id);
      return template || null;
    } catch (error) {
      console.error('Error finding email template by ID:', error);
      throw error;
    }
  }
  
  static async create(templateData) {
    try {
      const { id, name, subject, body, isEnabled, delayMinutes } = templateData;
      
      if (pgPool) {
        try {
          const query = `
            INSERT INTO email_templates (id, name, subject, body, is_enabled, delay_minutes, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          
          const values = [
            id,
            name,
            subject,
            body,
            isEnabled !== undefined ? isEnabled : true,
            delayMinutes || 0,
            new Date()
          ];
          
          const result = await pgPool.query(query, values);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newTemplate = {
        id,
        name,
        subject,
        body,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        delayMinutes: delayMinutes || 0,
        lastUpdated: new Date()
      };
      
      inMemoryStore.emailTemplates.templates.push(newTemplate);
      return newTemplate;
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }
  
  static async update(id, templateData) {
    try {
      const { name, subject, body, isEnabled, delayMinutes } = templateData;
      
      if (pgPool) {
        try {
          const query = `
            UPDATE email_templates
            SET name = $1, subject = $2, body = $3, is_enabled = $4, delay_minutes = $5, last_updated = $6
            WHERE id = $7
            RETURNING *
          `;
          
          const values = [
            name,
            subject,
            body,
            isEnabled,
            delayMinutes,
            new Date(),
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
      
      const templateIndex = inMemoryStore.emailTemplates.templates.findIndex(t => t.id === id);
      
      if (templateIndex === -1) {
        return null;
      }
      
      const updatedTemplate = {
        ...inMemoryStore.emailTemplates.templates[templateIndex],
        name: name !== undefined ? name : inMemoryStore.emailTemplates.templates[templateIndex].name,
        subject: subject !== undefined ? subject : inMemoryStore.emailTemplates.templates[templateIndex].subject,
        body: body !== undefined ? body : inMemoryStore.emailTemplates.templates[templateIndex].body,
        isEnabled: isEnabled !== undefined ? isEnabled : inMemoryStore.emailTemplates.templates[templateIndex].isEnabled,
        delayMinutes: delayMinutes !== undefined ? delayMinutes : inMemoryStore.emailTemplates.templates[templateIndex].delayMinutes,
        lastUpdated: new Date()
      };
      
      inMemoryStore.emailTemplates.templates[templateIndex] = updatedTemplate;
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating email template:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      if (pgPool) {
        try {
          const query = 'DELETE FROM email_templates WHERE id = $1 RETURNING *';
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const templateIndex = inMemoryStore.emailTemplates.templates.findIndex(t => t.id === id);
      
      if (templateIndex === -1) {
        return null;
      }
      
      const deletedTemplate = inMemoryStore.emailTemplates.templates[templateIndex];
      inMemoryStore.emailTemplates.templates.splice(templateIndex, 1);
      return deletedTemplate;
    } catch (error) {
      console.error('Error deleting email template:', error);
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
          CREATE TABLE IF NOT EXISTS email_templates (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            is_enabled BOOLEAN DEFAULT TRUE,
            delay_minutes INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW()
          )
        `;
        
        await pgPool.query(query);
        console.log('Email templates table initialized');
        
        const checkQuery = 'SELECT COUNT(*) FROM email_templates';
        const result = await pgPool.query(checkQuery);
        
        if (parseInt(result.rows[0].count) === 0) {
          console.log('Creating default email templates');
          
          const defaultTemplates = [
            {
              id: 'notify-me',
              name: 'Notify Me',
              subject: 'We\'ll notify you when {{product_name}} is available',
              body: 'Hello {{user_name}},\n\nThank you for your interest in {{product_name}}. We\'ll notify you as soon as it becomes available.\n\nBest regards,\nThe CANTEEN42 Team',
              isEnabled: true,
              delayMinutes: 0
            },
            {
              id: 'favorite',
              name: 'Product Favorited',
              subject: 'You favorited {{product_name}} — now 10% off!',
              body: 'Hello {{user_name}},\n\nWe noticed you favorited {{product_name}}. As a thank you, we\'re offering you a special 10% discount on this product.\n\nUse code: FAVORITE10\n\nBest regards,\nThe CANTEEN42 Team',
              isEnabled: true,
              delayMinutes: 0
            },
            {
              id: 'cart-abandonment',
              name: 'Cart Abandonment',
              subject: 'You left something behind in your cart',
              body: 'Hello {{user_name}},\n\nWe noticed you left some items in your cart. Your cart contains:\n\n{{cart_items}}\n\nTotal: {{cart_total}}\n\nClick here to complete your purchase: {{checkout_link}}\n\nBest regards,\nThe CANTEEN42 Team',
              isEnabled: true,
              delayMinutes: 120 // 2 hours
            }
          ];
          
          for (const template of defaultTemplates) {
            await EmailTemplateModel.create(template);
          }
        }
        
        return true;
      } catch (dbError) {
        console.warn('PostgreSQL table initialization error:', dbError.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing email templates table:', error);
      return false;
    }
  }
}

module.exports = EmailTemplateModel;
