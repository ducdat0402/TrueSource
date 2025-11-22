const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * Middleware để verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided. Access denied.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found. Invalid token.' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Authentication error: ' + error.message });
  }
};

/**
 * Middleware để check role
 * @param {...string} roles - Các roles được phép truy cập
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};

