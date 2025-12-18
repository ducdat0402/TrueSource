import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Register.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    walletAddress: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletVerifying, setWalletVerifying] = useState(false);
  const [walletStatus, setWalletStatus] = useState(null); // { valid, exists, message }
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Reset wallet status khi user thay đổi địa chỉ
    if (e.target.name === 'walletAddress') {
      setWalletStatus(null);
    }
  };

  const handleVerifyWallet = async () => {
    if (!formData.walletAddress || formData.walletAddress.trim() === '') {
      setError('Vui lòng nhập địa chỉ ví trước');
      return;
    }

    // Basic format validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(formData.walletAddress.trim())) {
      setWalletStatus({
        valid: false,
        exists: false,
        message: 'Địa chỉ ví không đúng định dạng (phải bắt đầu bằng 0x và có 42 ký tự)'
      });
      return;
    }

    setWalletVerifying(true);
    setError('');
    setWalletStatus(null);

    try {
      const response = await authAPI.verifyWallet(formData.walletAddress.trim());
      setWalletStatus(response.data);
    } catch (err) {
      setWalletStatus({
        valid: false,
        exists: false,
        message: err.response?.data?.error || 'Lỗi khi kiểm tra địa chỉ ví'
      });
    } finally {
      setWalletVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Validate wallet address (Ethereum address format)
    if (!formData.walletAddress || formData.walletAddress.trim() === '') {
      setError('Vui lòng nhập địa chỉ ví Ethereum');
      return;
    }

    // Basic Ethereum address validation (42 characters, starts with 0x)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(formData.walletAddress.trim())) {
      setError('Địa chỉ ví không hợp lệ. Vui lòng nhập địa chỉ Ethereum hợp lệ (0x...)');
      return;
    }

    setLoading(true);

    try {
      // Tự động set role = producer
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        walletAddress: formData.walletAddress.trim(),
        role: 'producer'
      });
      
      localStorage.setItem('token', response.data.token);
      // Include verificationStatus in user data
      const userData = {
        ...response.data.user,
        verificationStatus: response.data.user.verificationStatus || 'unverified'
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Redirect based on role
      if (response.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.data.user.role === 'producer') {
        navigate('/producer/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Đăng Ký Producer</h2>
        <p className="register-note">
          Chỉ Producer mới cần đăng ký để tạo và quản lý sản phẩm trên blockchain.
        </p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
          <div className="form-group">
            <label>Địa chỉ ví Ethereum *</label>
            <div className="wallet-input-group">
              <input
                type="text"
                name="walletAddress"
                value={formData.walletAddress}
                onChange={handleChange}
                required
                placeholder="0x..."
                pattern="^0x[a-fA-F0-9]{40}$"
                className={walletStatus ? (walletStatus.valid ? 'valid' : 'invalid') : ''}
              />
              <button
                type="button"
                className="btn-verify-wallet"
                onClick={handleVerifyWallet}
                disabled={walletVerifying || !formData.walletAddress}
              >
                {walletVerifying ? (
                  <>
                    <span className="spinner-small"></span>
                    Đang kiểm tra...
                  </>
                ) : (
                  'Kiểm tra'
                )}
              </button>
            </div>
            {walletStatus && (
              <div className={`wallet-status ${walletStatus.valid ? (walletStatus.exists ? 'success' : 'warning') : 'error'}`}>
                {walletStatus.valid ? (
                  walletStatus.exists ? (
                    <span>✅ {walletStatus.message}</span>
                  ) : (
                    <span>⚠️ {walletStatus.message}</span>
                  )
                ) : (
                  <span>❌ {walletStatus.message}</span>
                )}
              </div>
            )}
            <small>Địa chỉ ví Ethereum của bạn (bắt đầu bằng 0x, 42 ký tự). Nhấn "Kiểm tra" để xác minh địa chỉ trên testnet.</small>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <p className="login-link">
          Đã có tài khoản? <Link to="/producer/login">Đăng nhập</Link>
        </p>
        <p className="back-link">
          <Link to="/">← Về trang chủ</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;

