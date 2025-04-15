const { pgPool, inMemoryStore } = require('../config/db');

if (!inMemoryStore.products) {
  inMemoryStore.products = [];
}

if (inMemoryStore.products.length === 0) {
  inMemoryStore.products = [
    {
      id: '1',
      title: 'Sample Product 1',
      description: 'This is a sample product for development',
      price: 19.99,
      variants: [
        { name: 'Small', sku: 'SP1-S' },
        { name: 'Medium', sku: 'SP1-M' },
        { name: 'Large', sku: 'SP1-L' }
      ],
      stock: 100,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '2',
      title: 'Sample Product 2',
      description: 'Another sample product for testing',
      price: 29.99,
      variants: [
        { name: 'Black', sku: 'SP2-B' },
        { name: 'White', sku: 'SP2-W' }
      ],
      stock: 50,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  console.log('Added sample products to in-memory store');
}

class ProductModel {
  static async create(productData) {
    try {
      if (pgPool) {
        try {
          const { title, description, price, variants, stock, status } = productData;
          
          const query = `
            INSERT INTO products (title, description, price, variants, stock, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *
          `;
          
          const values = [
            title,
            description,
            price,
            JSON.stringify(variants || []),
            stock || 0,
            status || 'inactive'
          ];
          
          const result = await pgPool.query(query, values);
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const newProduct = {
        id: productData.id || Date.now().toString(),
        title: productData.title,
        description: productData.description,
        price: productData.price,
        variants: productData.variants || [],
        stock: productData.stock || 0,
        status: productData.status || 'inactive',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      inMemoryStore.products.push(newProduct);
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }
  
  static async findAll(filters = {}) {
    try {
      if (pgPool) {
        try {
          let query = 'SELECT * FROM products';
          const values = [];
          
          if (Object.keys(filters).length > 0) {
            const conditions = [];
            let paramIndex = 1;
            
            if (filters.status) {
              conditions.push(`status = $${paramIndex}`);
              values.push(filters.status);
              paramIndex++;
            }
            
            if (filters.minPrice) {
              conditions.push(`price >= $${paramIndex}`);
              values.push(filters.minPrice);
              paramIndex++;
            }
            
            if (filters.maxPrice) {
              conditions.push(`price <= $${paramIndex}`);
              values.push(filters.maxPrice);
              paramIndex++;
            }
            
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.join(' AND ');
            }
          }
          
          query += ' ORDER BY created_at DESC';
          
          const result = await pgPool.query(query, values);
          return result.rows;
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      let products = [...inMemoryStore.products];
      
      if (filters.status) {
        products = products.filter(p => p.status === filters.status);
      }
      
      if (filters.minPrice) {
        products = products.filter(p => p.price >= filters.minPrice);
      }
      
      if (filters.maxPrice) {
        products = products.filter(p => p.price <= filters.maxPrice);
      }
      
      products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return products;
    } catch (error) {
      console.error('Error finding products:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    try {
      if (pgPool) {
        try {
          const query = 'SELECT * FROM products WHERE id = $1';
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const product = inMemoryStore.products.find(p => p.id === id);
      return product || null;
    } catch (error) {
      console.error('Error finding product by ID:', error);
      throw error;
    }
  }
  
  static async update(id, productData) {
    try {
      if (pgPool) {
        try {
          const { title, description, price, variants, stock, status } = productData;
          
          const updates = [];
          const values = [];
          let paramIndex = 1;
          
          if (title !== undefined) {
            updates.push(`title = $${paramIndex}`);
            values.push(title);
            paramIndex++;
          }
          
          if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            values.push(description);
            paramIndex++;
          }
          
          if (price !== undefined) {
            updates.push(`price = $${paramIndex}`);
            values.push(price);
            paramIndex++;
          }
          
          if (variants !== undefined) {
            updates.push(`variants = $${paramIndex}`);
            values.push(JSON.stringify(variants));
            paramIndex++;
          }
          
          if (stock !== undefined) {
            updates.push(`stock = $${paramIndex}`);
            values.push(stock);
            paramIndex++;
          }
          
          if (status !== undefined) {
            updates.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
          }
          
          updates.push(`updated_at = NOW()`);
          
          values.push(id);
          
          const query = `
            UPDATE products
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
          `;
          
          const result = await pgPool.query(query, values);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const index = inMemoryStore.products.findIndex(p => p.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const updatedProduct = {
        ...inMemoryStore.products[index],
        ...productData,
        updated_at: new Date()
      };
      
      inMemoryStore.products[index] = updatedProduct;
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      if (pgPool) {
        try {
          const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
          const result = await pgPool.query(query, [id]);
          
          if (result.rows.length === 0) {
            return null;
          }
          
          return result.rows[0];
        } catch (dbError) {
          console.warn('PostgreSQL error, falling back to in-memory store:', dbError.message);
        }
      }
      
      const index = inMemoryStore.products.findIndex(p => p.id === id);
      
      if (index === -1) {
        return null;
      }
      
      const deletedProduct = inMemoryStore.products[index];
      inMemoryStore.products.splice(index, 1);
      return deletedProduct;
    } catch (error) {
      console.error('Error deleting product:', error);
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
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            variants JSONB DEFAULT '[]',
            stock INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'inactive',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        await pgPool.query(query);
        console.log('Products table initialized');
        return true;
      } catch (dbError) {
        console.warn('PostgreSQL table initialization error:', dbError.message);
        return false;
      }
    } catch (error) {
      console.error('Error initializing products table:', error);
      return false;
    }
  }
}

module.exports = ProductModel;
