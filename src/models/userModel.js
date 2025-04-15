const bcrypt = require('bcrypt');
const { pgPool, inMemoryStore } = require('../config/db');

if (!inMemoryStore.users) {
  inMemoryStore.users = [];
}

if (inMemoryStore.users.length === 0) {
  const createSampleAdmin = async () => {
    try {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      inMemoryStore.users.push({
        id: '1',
        name: 'Admin User',
        email: 'admin@canteen42.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('Added sample admin user to in-memory store');
    } catch (error) {
      console.error('Error creating sample admin user:', error);
    }
  };
  createSampleAdmin();
}

class UserModel {
  static async create(userData) {
    try {
      const { name, email, password, role } = userData;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      if (pgPool) {
        try {
          const query = `
            INSERT INTO users (name, email, password, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id, name, email, role, created_at, updated_at
          `;
          
          const values = [name, email, hashedPassword, role || 'user'];
          
          const result = await pgPool.query(query, values);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: hashedPassword,
        role: role || 'user',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      inMemoryStore.users.push(newUser);
      
      const { password: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  static async findAll() {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT id, name, email, role, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
          `;
          
          const result = await pgPool.query(query);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      return inMemoryStore.users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    } catch (error) {
      console.error('Error finding users:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT id, name, email, role, created_at, updated_at
            FROM users
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
      
      const user = inMemoryStore.users.find(u => u.id === id);
      
      if (!user) {
        return null;
      }
      
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
  
  static async findByEmail(email) {
    try {
      if (pgPool) {
        try {
          const query = `
            SELECT *
            FROM users
            WHERE email = $1
          `;
          
          const result = await pgPool.query(query, [email]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const user = inMemoryStore.users.find(u => u.email === email);
      return user || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
  
  static async update(id, userData) {
    try {
      const { name, email, password, role } = userData;
      
      if (pgPool) {
        try {
          let query = 'UPDATE users SET ';
          const values = [];
          const updates = [];
          let paramIndex = 1;
          
          if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
          }
          
          if (email !== undefined) {
            updates.push(`email = $${paramIndex}`);
            values.push(email);
            paramIndex++;
          }
          
          if (password !== undefined) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push(`password = $${paramIndex}`);
            values.push(hashedPassword);
            paramIndex++;
          }
          
          if (role !== undefined) {
            updates.push(`role = $${paramIndex}`);
            values.push(role);
            paramIndex++;
          }
          
          updates.push(`updated_at = NOW()`);
          
          query += updates.join(', ');
          query += ` WHERE id = $${paramIndex} RETURNING id, name, email, role, created_at, updated_at`;
          
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
      
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const updatedUser = { ...inMemoryStore.users[index] };
      
      if (name !== undefined) updatedUser.name = name;
      if (email !== undefined) updatedUser.email = email;
      if (password !== undefined) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updatedUser.password = hashedPassword;
      }
      if (role !== undefined) updatedUser.role = role;
      
      updatedUser.updated_at = new Date();
      
      inMemoryStore.users[index] = updatedUser;
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      if (pgPool) {
        try {
          const query = `
            DELETE FROM users
            WHERE id = $1
            RETURNING id, name, email, role, created_at, updated_at
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
      
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const deletedUser = inMemoryStore.users[index];
      inMemoryStore.users.splice(index, 1);
      
      const { password, ...userWithoutPassword } = deletedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  static async validatePassword(email, password) {
    try {
      const user = await this.findByEmail(email);
      
      if (!user) {
        return null;
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return null;
      }
      
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error validating password:', error);
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
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        await pgPool.query(query);
        console.log('Users table initialized');
        
        const checkAdminQuery = `
          SELECT * FROM users WHERE email = 'admin@canteen42.com' LIMIT 1
        `;
        
        const adminResult = await pgPool.query(checkAdminQuery);
        
        if (adminResult.rows.length === 0) {
          const hashedPassword = await bcrypt.hash('admin123', 10);
          
          const createAdminQuery = `
            INSERT INTO users (name, email, password, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
          `;
          
          await pgPool.query(createAdminQuery, [
            'Admin User',
            'admin@canteen42.com',
            hashedPassword,
            'admin'
          ]);
          
          console.log('Admin user created in PostgreSQL');
        }
        
        return true;
      } catch (dbError) {
        console.warn('PostgreSQL table initialization error:', dbError.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing users table:', error);
      return false;
    }
  }
}

module.exports = UserModel;
