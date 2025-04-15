const ProductModel = require('../models/productModel');

const validateProduct = (product) => {
  const errors = [];
  
  if (!product.title) {
    errors.push('Title is required');
  }
  
  if (!product.price) {
    errors.push('Price is required');
  } else if (isNaN(parseFloat(product.price)) || parseFloat(product.price) < 0) {
    errors.push('Price must be a positive number');
  }
  
  if (product.stock !== undefined && (isNaN(parseInt(product.stock)) || parseInt(product.stock) < 0)) {
    errors.push('Stock must be a non-negative integer');
  }
  
  if (product.status && !['active', 'inactive'].includes(product.status)) {
    errors.push('Status must be either "active" or "inactive"');
  }
  
  if (product.variants && !Array.isArray(product.variants)) {
    errors.push('Variants must be an array');
  }
  
  return errors;
};

const productController = {
  getAllProducts: async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
      };
      
      const products = await ProductModel.findAll(filters);
      
      res.status(200).json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getProductById: async (req, res) => {
    try {
      const product = await ProductModel.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error in getProductById:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  createProduct: async (req, res) => {
    try {
      const productData = {
        title: req.body.title,
        description: req.body.description,
        price: parseFloat(req.body.price),
        variants: req.body.variants,
        stock: req.body.stock !== undefined ? parseInt(req.body.stock) : 0,
        status: req.body.status || 'inactive'
      };
      
      const validationErrors = validateProduct(productData);
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      const newProduct = await ProductModel.create(productData);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: newProduct
      });
    } catch (error) {
      console.error('Error in createProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  updateProduct: async (req, res) => {
    try {
      const existingProduct = await ProductModel.findById(req.params.id);
      
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const updateData = {};
      
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.price !== undefined) updateData.price = parseFloat(req.body.price);
      if (req.body.variants !== undefined) updateData.variants = req.body.variants;
      if (req.body.stock !== undefined) updateData.stock = parseInt(req.body.stock);
      if (req.body.status !== undefined) updateData.status = req.body.status;
      
      const productToValidate = { ...existingProduct, ...updateData };
      const validationErrors = validateProduct(productToValidate);
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      const updatedProduct = await ProductModel.update(req.params.id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error in updateProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  deleteProduct: async (req, res) => {
    try {
      const deletedProduct = await ProductModel.delete(req.params.id);
      
      if (!deletedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: deletedProduct
      });
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = productController;
