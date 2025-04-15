const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const validateUser = (user) => {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!user.name) {
    errors.push('Name is required');
  }
  
  if (!user.email) {
    errors.push('Email is required');
  } else if (!emailRegex.test(user.email)) {
    errors.push('Invalid email format');
  }
  
  if (!user.password && user.isNewUser) {
    errors.push('Password is required');
  } else if (user.password && user.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (user.role && !['admin', 'user'].includes(user.role)) {
    errors.push('Role must be either "admin" or "user"');
  }
  
  return errors;
};

const userController = {
  getAllUsers: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Admin role required'
        });
      }
      
      const users = await UserModel.findAll();
      
      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getUserById: async (req, res) => {
    try {
      const userId = req.params.id;
      
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own profile'
        });
      }
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  createUser: async (req, res) => {
    try {
      if (req.user && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Admin role required'
        });
      }
      
      const userData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || 'user'
      };
      
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      const validationErrors = validateUser({ ...userData, isNewUser: true });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      const newUser = await UserModel.create(userData);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
      });
    } catch (error) {
      console.error('Error in createUser:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only update your own profile'
        });
      }
      
      const existingUser = await UserModel.findById(userId);
      
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const updateData = {};
      
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.password !== undefined) updateData.password = req.body.password;
      
      if (req.body.role !== undefined && req.user.role === 'admin') {
        updateData.role = req.body.role;
      }
      
      const validationErrors = validateUser({ ...existingUser, ...updateData, isNewUser: false });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await UserModel.findByEmail(updateData.email);
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }
      
      const updatedUser = await UserModel.update(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error in updateUser:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete your own account'
        });
      }
      
      const deletedUser = await UserModel.delete(userId);
      
      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: deletedUser
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      const user = await UserModel.validatePassword(email, password);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'canteen42-secret-key',
        { expiresIn: '24h' }
      );
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  register: async (req, res) => {
    try {
      const userData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: 'user' // Default role for self-registration
      };
      
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      const validationErrors = validateUser({ ...userData, isNewUser: true });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      const newUser = await UserModel.create(userData);
      
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET || 'canteen42-secret-key',
        { expiresIn: '24h' }
      );
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: newUser,
          token
        }
      });
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  getCurrentUser: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = userController;
