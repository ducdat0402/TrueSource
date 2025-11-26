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
    const { username, email, password, walletAddress } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Wallet address is required for producer
    if (!walletAddress || walletAddress.trim() === '') {
      return res.status(400).json({ error: 'Wallet address is required for producer registration' });
    }

    // Validate Ethereum address format
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(walletAddress.trim())) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address format' });
    }

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Kiểm tra wallet address đã được sử dụng chưa
    const existingWallet = await User.findOne({ 
      walletAddress: walletAddress.trim().toLowerCase() 
    });

    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet address is already registered' });
    }

    // Tạo user mới - tự động set role = producer, yêu cầu walletAddress
    const user = await User.create({
      username,
      email,
      password,
      role: 'producer', // Tự động set role = producer
      walletAddress: walletAddress.trim().toLowerCase(), // Lưu wallet address
      verificationStatus: 'unverified' // Producer mặc định là chưa xác thực
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
        walletAddress: user.walletAddress,
        verificationStatus: user.verificationStatus || 'unverified'
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
            walletAddress: user.walletAddress,
            verificationStatus: user.verificationStatus || 'unverified'
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

/**
 * POST /auth/verify-wallet
 * Kiểm tra địa chỉ ví có tồn tại trên testnet không
 */
router.post('/verify-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate Ethereum address format
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(walletAddress.trim())) {
      return res.status(400).json({ 
        error: 'Invalid Ethereum address format',
        valid: false 
      });
    }

    const app = require('../app');
    const web3 = app.web3;

    if (!web3) {
      return res.status(503).json({ 
        error: 'Blockchain service not available',
        valid: false 
      });
    }

    const address = walletAddress.trim().toLowerCase();

    try {
      // Kiểm tra địa chỉ có hợp lệ không
      const isValid = web3.utils.isAddress(address);
      if (!isValid) {
        return res.json({
          valid: false,
          message: 'Địa chỉ ví không hợp lệ'
        });
      }

      // Kiểm tra balance (nếu có balance hoặc đã từng có transaction thì địa chỉ tồn tại)
      const balance = await web3.eth.getBalance(address);
      // Convert BigInt to string
      const balanceStr = typeof balance === 'bigint' ? balance.toString() : balance;
      const balanceInEth = web3.utils.fromWei(balanceStr, 'ether');

      // Kiểm tra transaction count (nonce) - nếu > 0 thì địa chỉ đã từng được sử dụng
      const transactionCount = await web3.eth.getTransactionCount(address);
      // Convert BigInt to number/string
      const txCount = typeof transactionCount === 'bigint' ? Number(transactionCount) : Number(transactionCount);

      // Kiểm tra code tại địa chỉ (nếu là contract)
      const code = await web3.eth.getCode(address);
      const isContract = code !== '0x' && code !== '0x0';

      // Địa chỉ được coi là tồn tại nếu:
      // - Có balance > 0, HOẶC
      // - Đã từng có transaction (transactionCount > 0), HOẶC
      // - Là contract address
      const balanceNum = parseFloat(balanceInEth);
      const exists = balanceNum > 0 || txCount > 0 || isContract;

      return res.json({
        valid: true,
        exists: exists,
        isContract: isContract,
        balance: balanceInEth, // Already a string from fromWei
        transactionCount: txCount, // Converted to number
        message: exists 
          ? (isContract 
              ? 'Địa chỉ ví hợp lệ (Contract address)' 
              : `Địa chỉ ví hợp lệ và đã tồn tại trên testnet (Balance: ${balanceNum.toFixed(4)} ETH)`)
          : 'Địa chỉ ví hợp lệ nhưng chưa có giao dịch trên testnet'
      });
    } catch (error) {
      console.error('Error verifying wallet:', error);
      return res.status(500).json({
        valid: false,
        error: 'Lỗi khi kiểm tra địa chỉ ví: ' + error.message
      });
    }
  } catch (error) {
    console.error('Verify wallet error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

