const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: No token provided' 
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'canteen42-secret-key');
      req.user = decoded;
      return next();
    } catch (jwtError) {
      if (process.env.NODE_ENV === 'production') {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          req.user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'user'
          };
          return next();
        } catch (firebaseError) {
          return res.status(401).json({ 
            success: false,
            message: 'Unauthorized: Invalid token' 
          });
        }
      } else {
        if (token === 'dev-token') {
          req.user = { id: 'dev-user-id', email: 'dev@example.com', role: 'admin' };
          return next();
        }
        
        return res.status(401).json({ 
          success: false,
          message: 'Unauthorized: Invalid token' 
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Admin access required' 
    });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin
};
