import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import './ProducerVerification.css';

function ProducerVerification() {
  const [formData, setFormData] = useState({
    companyName: '',
    businessLicense: '',
    taxId: '',
    address: '',
    fullName: '',
    phone: '',
    email: '',
    walletAddress: ''
  });
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      const response = await userAPI.getVerificationStatus();
      setVerificationStatus(response.data.verificationStatus);
      
      // Nếu đã có verification, load data vào form
      if (response.data.verification) {
        const v = response.data.verification;
        setFormData({
          companyName: v.companyName || '',
          businessLicense: v.businessLicense || '',
          taxId: v.taxId || '',
          address: v.address || '',
          fullName: v.fullName || '',
          phone: v.phone || '',
          email: v.email || '',
          walletAddress: v.walletAddress || ''
        });
      } else {
        // Load user info
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          walletAddress: user.walletAddress || ''
        }));
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'businessLicense' && files && files[0]) {
      // Handle file upload - convert to base64 or store file
      const file = files[0];
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.');
        e.target.value = ''; // Clear file input
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Chỉ chấp nhận file ảnh (JPG, PNG) hoặc PDF.');
        e.target.value = ''; // Clear file input
        return;
      }
      
      setError(''); // Clear previous errors
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          businessLicense: reader.result // Base64 string
        }));
      };
      reader.onerror = () => {
        setError('Lỗi khi đọc file. Vui lòng thử lại.');
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.companyName || !formData.businessLicense || !formData.taxId || 
        !formData.address || !formData.fullName || !formData.phone || 
        !formData.email || !formData.walletAddress) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setSubmitting(true);
    try {
      const response = await userAPI.registerVerification(formData);
      setSuccess('Đăng ký xác thực thành công! Vui lòng chờ admin duyệt.');
      setVerificationStatus('pending');
      setTimeout(() => {
        navigate('/producer/dashboard');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Có lỗi xảy ra khi đăng ký xác thực');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  // Nếu đã verified, redirect
  if (verificationStatus === 'verified') {
    return (
      <div className="verification-container">
        <div className="verified-message">
          <div className="success-icon">✓</div>
          <h2>Bạn đã được xác thực!</h2>
          <p>Bạn có thể sử dụng tất cả tính năng của producer.</p>
          <button onClick={() => navigate('/producer/dashboard')}>
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Nếu đang pending
  if (verificationStatus === 'pending') {
    return (
      <div className="verification-container">
        <div className="pending-message">
          <div className="pending-icon">⏳</div>
          <h2>Đang chờ duyệt</h2>
          <p>Đơn xác thực của bạn đang được admin xem xét. Vui lòng đợi.</p>
          <button onClick={() => navigate('/producer/dashboard')}>
            Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Nếu bị rejected
  if (verificationStatus === 'rejected') {
    return (
      <div className="verification-container">
        <div className="rejected-message">
          <div className="rejected-icon">✗</div>
          <h2>Đơn xác thực bị từ chối</h2>
          <p>Đơn xác thực của bạn đã bị từ chối. Vui lòng kiểm tra lại thông tin và đăng ký lại.</p>
          <button onClick={() => setVerificationStatus('unverified')}>
            Đăng ký lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-container">
      <div className="verification-form-card">
        <h2>Đăng Ký Xác Thực Producer</h2>
        <p className="form-description">
          Vui lòng điền đầy đủ thông tin để được xác thực. Sau khi admin duyệt, bạn sẽ có quyền tạo sản phẩm và ghi lên blockchain.
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên công ty / Hộ sản xuất *</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Ví dụ: Công ty TNHH ABC"
              required
            />
          </div>

          <div className="form-group">
            <label>Giấy phép kinh doanh (Ảnh / PDF) *</label>
            <input
              type="file"
              name="businessLicense"
              onChange={handleChange}
              accept="image/*,.pdf"
              required
            />
            <small>Chấp nhận file ảnh (JPG, PNG) hoặc PDF</small>
          </div>

          <div className="form-group">
            <label>Mã số thuế *</label>
            <input
              type="text"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              placeholder="Ví dụ: 0123456789"
              required
            />
          </div>

          <div className="form-group">
            <label>Địa chỉ trụ sở / Trang trại *</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Ví dụ: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
              rows="3"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Họ tên *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
              />
            </div>

            <div className="form-group">
              <label>Số điện thoại *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ví dụ: 0901234567"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled
              />
              <small>Email từ tài khoản đăng ký</small>
            </div>

            <div className="form-group">
              <label>Địa chỉ ví *</label>
              <input
                type="text"
                name="walletAddress"
                value={formData.walletAddress}
                onChange={handleChange}
                placeholder="0x..."
                required
                disabled={!!formData.walletAddress}
              />
              <small>Địa chỉ ví từ tài khoản đăng ký</small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đơn xác thực'}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate('/producer/dashboard')}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProducerVerification;


