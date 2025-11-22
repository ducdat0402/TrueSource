const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const router = express.Router();

/**
 * POST /auth/register
 * Đăng ký user mới
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, walletAddress } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Tạo user mới
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'consumer',
      walletAddress
    });

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auth/login
 * Đăng nhập
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Kiểm tra password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /auth/me
 * Lấy thông tin user hiện tại (cần authenticate)
 * Note: Middleware authenticate sẽ được apply ở app.js
 */

module.exports = router;

