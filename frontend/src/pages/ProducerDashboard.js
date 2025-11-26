import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Web3 } from 'web3';
import { QRCodeSVG } from 'qrcode.react';
import { productAPI, userAPI, contractAPI } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import './ProducerDashboard.css';

// Helper function to translate status
function getStatusLabel(status) {
  const statusMap = {
    'Created': 'Đã tạo',
    'In Transit': 'Đang vận chuyển',
    'At Warehouse': 'Tại kho',
    'In Customs': 'Thông quan',
    'Delivered': 'Đã giao hàng',
    'Completed': 'Hoàn thành',
    'Approved': 'Đã phê duyệt',
    'Shipped': 'Đã gửi hàng'
  };
  return statusMap[status] || status;
}

// Helper function to translate event type
function getEventTypeLabel(eventType) {
  const eventMap = {
    'Shipment': 'Giao hàng',
    'Warehouse': 'Kho hàng',
    'Customs': 'Hải quan',
    'Delivery': 'Vận chuyển',
    'StatusUpdate': 'Cập nhật trạng thái',
    'AdminApproval': 'Phê duyệt quản trị'
  };
  return eventMap[eventType] || eventType;
}

function ProducerDashboard() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [formData, setFormData] = useState({
    origin: '',
    productName: '',
    category: ''
  });
  const [updateFormData, setUpdateFormData] = useState({
    newStatus: '',
    eventType: '',
    location: '',
    details: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [contractInfo, setContractInfo] = useState(null);
  const navigate = useNavigate();

  // Function to show popup
  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
    // Auto close after 3 seconds
    setTimeout(() => {
      setPopup({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Function to close popup
  const closePopup = () => {
    setPopup({ show: false, message: '', type: 'success' });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/producer/login');
      return;
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    // Check if user is producer
    if (userData.role !== 'producer' && userData.role !== 'admin') {
      navigate('/');
      return;
    }

    // Load verification status
    loadVerificationStatus();

    // Load contract info
    loadContractInfo();

    // Initialize Socket.io
    initSocket(token);
    const socket = getSocket();

    // Listen for product updates
    socket.on('product-created', (data) => {
      if (data.producerAddress?.toLowerCase() === userData.walletAddress?.toLowerCase()) {
        loadProducts();
      }
    });

    socket.on('product-updated', (data) => {
      if (selectedProduct && data.productId === selectedProduct.id) {
        loadProductDetails(selectedProduct.id);
      }
      loadProducts();
    });

    loadProducts();

    return () => {
      socket.off('product-created');
      socket.off('product-updated');
    };
  }, [navigate, selectedProduct]);

  const loadProducts = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Nếu producer chưa có walletAddress, không load sản phẩm
      if (userData.role === 'producer' && !userData.walletAddress) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get products của producer
      const response = await userAPI.getMyProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      // Không fallback nữa - chỉ hiển thị sản phẩm của producer
      setProducts([]);
      if (error.response?.data?.error?.includes('wallet address')) {
        showPopup('Bạn cần có địa chỉ ví để xem sản phẩm. Vui lòng đăng ký xác thực producer.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (id) => {
    try {
      const productRes = await productAPI.getById(id);
      setSelectedProduct(productRes.data);
      // Use events from MongoDB (has txHash) instead of blockchain history
      // Blockchain history doesn't have txHash for individual events
      if (productRes.data.events) {
        setHistory({ events: productRes.data.events });
      } else {
        // Fallback to blockchain history if MongoDB events not available
        try {
          const historyRes = await productAPI.getHistory(id);
          setHistory(historyRes.data);
        } catch (err) {
          console.warn('Could not load history from blockchain:', err);
          setHistory({ events: [] });
        }
      }
    } catch (error) {
      console.error('Error loading product details:', error);
    }
  };

  const loadVerificationStatus = async () => {
    try {
      const response = await userAPI.getVerificationStatus();
      setVerificationStatus(response.data.verificationStatus || 'unverified');
      // Update user data in localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.verificationStatus = response.data.verificationStatus || 'unverified';
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error loading verification status:', error);
      // Fallback to user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setVerificationStatus(userData.verificationStatus || 'unverified');
    }
  };

  const loadContractInfo = async () => {
    try {
      const response = await contractAPI.getInfo();
      setContractInfo(response.data);
    } catch (error) {
      console.error('Error loading contract info:', error);
    }
  };

  // Function to check if action requires verification
  const checkVerification = (actionName) => {
    if (user?.role === 'admin') {
      return true; // Admin không cần verification
    }
    if (verificationStatus === 'verified') {
      return true;
    }
    // Show popup if not verified
    setShowVerificationPopup(true);
    return false;
  };

  // Function to get verification status label
  const getVerificationStatusLabel = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Đã xác thực';
      case 'pending':
        return 'Đang chờ phê duyệt';
      case 'rejected':
        return 'Đã bị từ chối';
      default:
        return 'Chưa xác thực';
    }
  };

  // Function to get verification status color
  const getVerificationStatusColor = () => {
    switch (verificationStatus) {
      case 'verified':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'rejected':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    loadProductDetails(product.id);
    setShowUpdateForm(false);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    // Check verification
    if (!checkVerification('Thêm sản phẩm')) {
      return;
    }

    // Check wallet address
    if (!user?.walletAddress) {
      showPopup('Bạn cần có địa chỉ ví để tạo sản phẩm. Vui lòng đăng ký xác thực producer.', 'error');
      return;
    }

    if (!formData.origin || !formData.productName || !formData.category) {
      showPopup('Vui lòng điền đầy đủ thông tin sản phẩm', 'error');
      return;
    }

    // Check MetaMask
    if (typeof window.ethereum === 'undefined') {
      showPopup('Vui lòng cài đặt MetaMask để tạo sản phẩm trên blockchain', 'error');
      return;
    }

    setIsAdding(true);
    try {
      // 1. Kết nối MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const userAddress = accounts[0];

      // 2. Kiểm tra địa chỉ ví khớp
      if (userAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        showPopup(`Vui lòng đăng nhập MetaMask với địa chỉ ví: ${user.walletAddress}`, 'error');
        setIsAdding(false);
        return;
      }

      // 3. Load contract info nếu chưa có
      let contractAddress = contractInfo?.contractAddress;
      let contractABI = contractInfo?.abi;
      
      if (!contractAddress || !contractABI) {
        const contractResponse = await contractAPI.getInfo();
        contractAddress = contractResponse.data.contractAddress;
        contractABI = contractResponse.data.abi;
        setContractInfo(contractResponse.data);
      }

      if (!contractAddress || !contractABI) {
        showPopup('Không thể tải thông tin contract. Vui lòng thử lại.', 'error');
        setIsAdding(false);
        return;
      }

      // 4. Generate QR Hash tự động (đảm bảo unique)
      // Format: PROD-{timestamp}-{randomHex}-{walletPrefix}
      const timestamp = Date.now();
      const randomHex = Math.random().toString(16).substring(2, 10);
      const qrHash = `PROD-${timestamp}-${randomHex}-${userAddress.substring(2, 8).toUpperCase()}`;

      // 5. Tạo contract instance
      const contract = new web3.eth.Contract(contractABI, contractAddress);

      // 6. Tạo transaction với QR Hash đã generate
      const tx = contract.methods.addProduct(formData.origin, formData.productName, formData.category, qrHash);
      
      // 7. Estimate gas và tăng gas price để transaction được confirm nhanh hơn
      const gas = await tx.estimateGas({ from: userAddress });
      const baseGasPrice = await web3.eth.getGasPrice();
      // Tăng gas price thêm 20% để transaction được confirm nhanh hơn
      // Convert to number, calculate, then back to string
      const baseGasPriceNum = typeof baseGasPrice === 'string' ? parseInt(baseGasPrice) : Number(baseGasPrice);
      const gasPrice = Math.floor(baseGasPriceNum * 1.2).toString();

      // 8. Gửi transaction qua MetaMask (MetaMask sẽ ký tự động)
      showPopup('Vui lòng xác nhận transaction trên MetaMask...', 'success');
      
      const receipt = await tx.send({
        from: userAddress,
        gas: gas,
        gasPrice: gasPrice
      });

      // 9. Sau khi transaction thành công, gửi thông tin lên backend
      const response = await productAPI.create({
        origin: formData.origin,
        productName: formData.productName,
        category: formData.category,
        qrHash: qrHash,
        txHash: receipt.transactionHash
      });

      showPopup('Sản phẩm đã được thêm thành công lên blockchain!', 'success');
      setShowAddForm(false);
      setFormData({ origin: '', productName: '', category: '' });
      loadProducts();
      
      // Select the new product
      if (response.data.product) {
        handleProductClick(response.data.product);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      if (error.code === 4001) {
        showPopup('Bạn đã từ chối transaction trên MetaMask', 'error');
      } else if (error.code === -32603) {
        showPopup('Lỗi transaction: ' + (error.message || 'Vui lòng kiểm tra lại thông tin'), 'error');
      } else {
        showPopup('Lỗi: ' + (error.response?.data?.error || error.message || 'Có lỗi xảy ra'), 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    
    // Check verification
    if (!checkVerification('Cập nhật trạng thái')) {
      return;
    }

    // Check wallet address
    if (!user?.walletAddress) {
      showPopup('Bạn cần có địa chỉ ví để cập nhật sản phẩm.', 'error');
      return;
    }

    if (!updateFormData.newStatus || !updateFormData.eventType || 
        !updateFormData.location || !updateFormData.details) {
      showPopup('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    if (!selectedProduct) {
      showPopup('Vui lòng chọn sản phẩm', 'error');
      return;
    }

    // Check MetaMask
    if (typeof window.ethereum === 'undefined') {
      showPopup('Vui lòng cài đặt MetaMask để cập nhật sản phẩm trên blockchain', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      // 1. Kết nối MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const userAddress = accounts[0];

      // 2. Kiểm tra địa chỉ ví khớp
      if (userAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        showPopup(`Vui lòng đăng nhập MetaMask với địa chỉ ví: ${user.walletAddress}`, 'error');
        setIsUpdating(false);
        return;
      }

      // 3. Load contract info nếu chưa có
      let contractAddress = contractInfo?.contractAddress;
      let contractABI = contractInfo?.abi;
      
      if (!contractAddress || !contractABI) {
        const contractResponse = await contractAPI.getInfo();
        contractAddress = contractResponse.data.contractAddress;
        contractABI = contractResponse.data.abi;
        setContractInfo(contractResponse.data);
      }

      if (!contractAddress || !contractABI) {
        showPopup('Không thể tải thông tin contract. Vui lòng thử lại.', 'error');
        setIsUpdating(false);
        return;
      }

      // 4. Tạo contract instance
      const contract = new web3.eth.Contract(contractABI, contractAddress);

      // 5. Tạo transaction
      const tx = contract.methods.updateStatus(
        selectedProduct.id,
        updateFormData.newStatus,
        updateFormData.eventType,
        updateFormData.location,
        updateFormData.details
      );
      
      // 6. Estimate gas và tăng gas price để transaction được confirm nhanh hơn
      const gas = await tx.estimateGas({ from: userAddress });
      const baseGasPrice = await web3.eth.getGasPrice();
      // Tăng gas price thêm 20% để transaction được confirm nhanh hơn
      // Convert to number, calculate, then back to string
      const baseGasPriceNum = typeof baseGasPrice === 'string' ? parseInt(baseGasPrice) : Number(baseGasPrice);
      const gasPrice = Math.floor(baseGasPriceNum * 1.2).toString();

      // 7. Gửi transaction qua MetaMask
      showPopup('Vui lòng xác nhận transaction trên MetaMask...', 'success');
      
      const receipt = await tx.send({
        from: userAddress,
        gas: gas,
        gasPrice: gasPrice
      });

      // 8. Sau khi transaction thành công, gửi thông tin lên backend
      const response = await userAPI.updateProductStatus(selectedProduct.id, {
        ...updateFormData,
        txHash: receipt.transactionHash
      });

      showPopup('Cập nhật trạng thái thành công lên blockchain!', 'success');
      setShowUpdateForm(false);
      setUpdateFormData({ newStatus: '', eventType: '', location: '', details: '' });
      loadProductDetails(selectedProduct.id);
      loadProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      if (error.code === 4001) {
        showPopup('Bạn đã từ chối transaction trên MetaMask', 'error');
      } else if (error.code === -32603) {
        showPopup('Lỗi transaction: ' + (error.message || 'Vui lòng kiểm tra lại thông tin'), 'error');
      } else {
        showPopup('Lỗi: ' + (error.response?.data?.error || error.message || 'Có lỗi xảy ra'), 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="producer-dashboard">
      <header className="dashboard-header">
        <h1>Producer Dashboard</h1>
        <div className="user-info">
          <span>Xin chào, {user?.username || 'Producer'}</span>
          {user?.walletAddress && (
            <span className="wallet-address">{user.walletAddress}</span>
          )}
          <div className="verification-status-header">
            <span 
              className="verification-status-badge"
              style={{ backgroundColor: getVerificationStatusColor() }}
            >
              {getVerificationStatusLabel()}
            </span>
            {verificationStatus !== 'verified' && (
              <button 
                className="verify-btn-header"
                onClick={() => navigate('/producer/verification')}
              >
                Đăng ký xác thực
              </button>
            )}
          </div>
          <button onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
          }}>Đăng xuất</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar - Product List */}
        <div className="products-sidebar">
          <div className="sidebar-header">
            <h2>Sản Phẩm Của Tôi</h2>
            <button 
              className="add-product-btn"
              onClick={() => {
                if (!checkVerification('Thêm sản phẩm')) {
                  return;
                }
                setShowAddForm(true);
                setShowUpdateForm(false);
                setSelectedProduct(null);
              }}
            >
              + Thêm Sản Phẩm
            </button>
          </div>

          {showAddForm && (
            <div className="add-product-form">
              <h3>Thêm Sản Phẩm Mới</h3>
              <form onSubmit={handleAddProduct}>
                <div className="form-group">
                  <label>Tên sản phẩm: <span style={{color: 'red'}}>*</span></label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    placeholder="Ví dụ: Cà chua hữu cơ"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loại sản phẩm: <span style={{color: 'red'}}>*</span></label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  >
                    <option value="">-- Chọn loại sản phẩm --</option>
                    <option value="HÀNG TIÊU DÙNG">HÀNG TIÊU DÙNG</option>
                    <option value="HÀNG THỜI TRANG">HÀNG THỜI TRANG</option>
                    <option value="HÀNG ĐIỆN TỬ">HÀNG ĐIỆN TỬ</option>
                    <option value="HÀNG CÔNG NGHIỆP">HÀNG CÔNG NGHIỆP</option>
                    <option value="HÀNG NÔNG SẢN">HÀNG NÔNG SẢN</option>
                    <option value="HÀNG NGUY HIỂM">HÀNG NGUY HIỂM</option>
                    <option value="HÀNG QUÁ KHỔ QUÁ TẢI">HÀNG QUÁ KHỔ QUÁ TẢI</option>
                    <option value="HÀNG DỄ VỠ">HÀNG DỄ VỠ</option>
                    <option value="HÀNG GIÁ TRỊ CAO">HÀNG GIÁ TRỊ CAO</option>
                    <option value="HÀNG THƯƠNG MẠI ĐIỆN TỬ">HÀNG THƯƠNG MẠI ĐIỆN TỬ</option>
                    <option value="HÀNG TÀI LIỆU">HÀNG TÀI LIỆU</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Xuất xứ: <span style={{color: 'red'}}>*</span></label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({...formData, origin: e.target.value})}
                    placeholder="Ví dụ: Vietnam - Ho Chi Minh City"
                    required
                  />
                </div>
                <div className="form-group">
                  <small className="form-hint" style={{color: '#666', fontSize: '0.9em'}}>
                    💡 Mã QR Hash sẽ được tự động tạo khi bạn thêm sản phẩm
                  </small>
                </div>
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <span className="loading-content">
                        <span className="blockchain-loader"></span>
                        <span>Đang thêm lên Blockchain...</span>
                      </span>
                    ) : (
                      'Thêm lên Blockchain'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    disabled={isAdding}
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({ origin: '', productName: '', category: '' });
                    }}
                  >
                    Hủy
                  </button>
                </div>
                {isAdding && (
                  <div className="blockchain-progress">
                    <div className="progress-message">
                      <span className="blockchain-animation"></span>
                      <span>Đang ghi dữ liệu lên Blockchain...</span>
                    </div>
                    <div className="progress-steps">
                      <div className="step active">1. Ký giao dịch</div>
                      <div className={`step ${isAdding ? 'active' : ''}`}>2. Gửi lên mạng</div>
                      <div className="step">3. Chờ xác nhận</div>
                      <div className="step">4. Hoàn thành</div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          <div className="products-list">
            {products.map(product => (
              <div
                key={product.id}
                className={`product-item ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                onClick={() => handleProductClick(product)}
              >
                <div className="product-item-header">
                  <h4>{product.productName || `Sản phẩm #${product.id}`}</h4>
                  <span className={`status-badge status-${product.currentStatus?.toLowerCase()}`}>
                    {getStatusLabel(product.currentStatus)}
                  </span>
                </div>
                {product.category && (
                  <p className="product-category" style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                    📦 {product.category}
                  </p>
                )}
                <p className="product-origin">{product.origin}</p>
                <p className="product-date">
                  {new Date(product.createdAt * 1000).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
            {products.length === 0 && !showAddForm && (
              <p className="no-products">Chưa có sản phẩm nào. Nhấn "Thêm Sản Phẩm" để bắt đầu.</p>
            )}
          </div>
        </div>

        {/* Main Content - Product Details */}
        <div className="product-details-panel">
          {selectedProduct ? (
            <>
              <div className="product-details-header">
                <h2>Sản Phẩm #{selectedProduct.id}</h2>
                <button 
                  className="update-status-btn"
                  onClick={() => {
                    if (!checkVerification('Cập nhật trạng thái')) {
                      return;
                    }
                    setShowUpdateForm(!showUpdateForm);
                  }}
                >
                  {showUpdateForm ? 'Hủy' : 'Cập Nhật Trạng Thái'}
                </button>
              </div>

              {showUpdateForm && (
                <div className="update-status-form">
                  <h3>Cập Nhật Trạng Thái Sản Phẩm</h3>
                  <form onSubmit={handleUpdateStatus}>
                    <div className="form-group">
                      <label>Trạng thái mới:</label>
                      <select
                        value={updateFormData.newStatus}
                        onChange={(e) => setUpdateFormData({...updateFormData, newStatus: e.target.value})}
                        required
                      >
                        <option value="">Chọn trạng thái</option>
                        <option value="Created">Đã tạo</option>
                        <option value="In Transit">Đang vận chuyển</option>
                        <option value="At Warehouse">Tại kho</option>
                        <option value="In Customs">Thông quan</option>
                        <option value="Delivered">Đã giao hàng</option>
                        <option value="Completed">Hoàn thành</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Loại sự kiện:</label>
                      <select
                        value={updateFormData.eventType}
                        onChange={(e) => setUpdateFormData({...updateFormData, eventType: e.target.value})}
                        required
                      >
                        <option value="">Chọn loại sự kiện</option>
                        <option value="Shipment">Giao hàng</option>
                        <option value="Warehouse">Kho hàng</option>
                        <option value="Customs">Hải quan</option>
                        <option value="Delivery">Vận chuyển</option>
                        <option value="StatusUpdate">Cập nhật trạng thái</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Địa điểm:</label>
                      <input
                        type="text"
                        value={updateFormData.location}
                        onChange={(e) => setUpdateFormData({...updateFormData, location: e.target.value})}
                        placeholder="Ví dụ: Warehouse A - Ho Chi Minh City"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Chi tiết:</label>
                      <textarea
                        value={updateFormData.details}
                        onChange={(e) => setUpdateFormData({...updateFormData, details: e.target.value})}
                        placeholder="Mô tả chi tiết về sự kiện này"
                        rows="4"
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="submit-btn"
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <span className="loading-content">
                            <span className="blockchain-loader"></span>
                            <span>Đang cập nhật lên Blockchain...</span>
                          </span>
                        ) : (
                          'Cập Nhật lên Blockchain'
                        )}
                      </button>
                      <button 
                        type="button" 
                        className="cancel-btn"
                        disabled={isUpdating}
                        onClick={() => {
                          setShowUpdateForm(false);
                          setUpdateFormData({ newStatus: '', eventType: '', location: '', details: '' });
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                    {isUpdating && (
                      <div className="blockchain-progress">
                        <div className="progress-message">
                          <span className="blockchain-animation"></span>
                          <span>Đang ghi dữ liệu lên Blockchain...</span>
                        </div>
                        <div className="progress-steps">
                          <div className="step active">1. Ký giao dịch</div>
                          <div className={`step ${isUpdating ? 'active' : ''}`}>2. Gửi lên mạng</div>
                          <div className="step">3. Chờ xác nhận</div>
                          <div className="step">4. Hoàn thành</div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              )}

              <div className="product-info-section">
                <h3>Thông Tin Sản Phẩm</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Tên sản phẩm:</label>
                    <span style={{fontWeight: 'bold', fontSize: '1.1em'}}>{selectedProduct.productName || `Sản phẩm #${selectedProduct.id}`}</span>
                  </div>
                  <div className="info-item">
                    <label>Loại sản phẩm:</label>
                    <span>{selectedProduct.category || 'Chưa có'}</span>
                  </div>
                  <div className="info-item">
                    <label>Xuất xứ:</label>
                    <span>{selectedProduct.origin}</span>
                  </div>
                  <div className="info-item">
                    <label>Trạng thái:</label>
                    <span className={`status-badge status-${selectedProduct.currentStatus?.toLowerCase()}`}>
                      {getStatusLabel(selectedProduct.currentStatus)}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Mã QR Hash:</label>
                    <span className="qr-hash">{selectedProduct.qrCodeHash}</span>
                  </div>
                  <div className="info-item" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '20px', borderTop: '1px solid #eee', marginTop: '10px'}}>
                    <label style={{display: 'block', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1em'}}>Mã QR Code Sản Phẩm:</label>
                    <div style={{display: 'inline-block', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}}>
                      <QRCodeSVG 
                        value={selectedProduct.qrCodeHash} 
                        size={250}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p style={{marginTop: '15px', fontSize: '0.95em', color: '#666'}}>
                      📱 Quét mã QR này để xem thông tin sản phẩm trên trang chủ
                    </p>
                    <p style={{marginTop: '5px', fontSize: '0.85em', color: '#999'}}>
                      Mã QR Hash: {selectedProduct.qrCodeHash}
                    </p>
                  </div>
                  <div className="info-item">
                    <label>Ngày tạo:</label>
                    <span>{new Date(selectedProduct.createdAt * 1000).toLocaleString('vi-VN')}</span>
                  </div>
                  {selectedProduct.txHash && (
                    <div className="info-item">
                      <label>Transaction Hash:</label>
                      <span className="tx-hash">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${selectedProduct.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedProduct.txHash}
                        </a>
                      </span>
                    </div>
                  )}
                  {selectedProduct.blockNumber && (
                    <div className="info-item">
                      <label>Block Number:</label>
                      <span>
                        <a 
                          href={`https://sepolia.etherscan.io/block/${selectedProduct.blockNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedProduct.blockNumber}
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Events from Smart Contract */}
              {history && history.events && history.events.length > 0 && (
                <div className="events-section">
                  <h3>Sự Kiện Từ Smart Contract</h3>
                  <div className="events-timeline">
                    {history.events.map((event, idx) => (
                      <div key={idx} className="event-card">
                        <div className="event-header">
                          <span className="event-type">{getEventTypeLabel(event.eventType)}</span>
                          <span className="event-time">
                            {new Date(event.timestamp * 1000).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className="event-body">
                          <p><strong>Địa điểm:</strong> {event.location}</p>
                          <p><strong>Chi tiết:</strong> {event.details}</p>
                          {event.signer && (
                            <p><strong>Người ký:</strong> 
                              <span className="signer-address">{event.signer}</span>
                            </p>
                          )}
                          {event.txHash && (
                            <p style={{marginTop: '10px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                              <strong>🔗 Transaction Hash:</strong>{' '}
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{color: '#007bff', textDecoration: 'none', wordBreak: 'break-all'}}
                              >
                                {event.txHash}
                              </a>
                              {event.blockNumber && (
                                <span style={{marginLeft: '10px', color: '#666', fontSize: '0.9em'}}>
                                  (Block: {event.blockNumber})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!history || !history.events || history.events.length === 0) && (
                <div className="no-events">
                  <p>Chưa có sự kiện nào cho sản phẩm này.</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Chọn một sản phẩm từ danh sách bên trái để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* Popup Modal */}
      {popup.show && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className={`popup-modal popup-${popup.type}`} onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">
              {popup.type === 'success' ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <h3 className="popup-title">
              {popup.type === 'success' ? 'Thành công!' : 'Lỗi!'}
            </h3>
            <p className="popup-message">{popup.message}</p>
            <button className="popup-close-btn" onClick={closePopup}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Verification Required Popup */}
      {showVerificationPopup && (
        <div className="popup-overlay" onClick={() => setShowVerificationPopup(false)}>
          <div className="popup-modal popup-warning" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="popup-title">Cần Xác Thực Producer</h3>
            <p className="popup-message">
              Bạn cần xác thực producer để thực hiện chức năng này. 
              {verificationStatus === 'pending' && ' Đơn xác thực của bạn đang chờ admin duyệt.'}
              {verificationStatus === 'rejected' && ' Đơn xác thực của bạn đã bị từ chối. Vui lòng đăng ký lại.'}
              {(!verificationStatus || verificationStatus === 'unverified') && ' Vui lòng đăng ký xác thực producer.'}
            </p>
            <div className="popup-actions">
              <button 
                className="popup-primary-btn" 
                onClick={() => {
                  setShowVerificationPopup(false);
                  navigate('/producer/verification');
                }}
              >
                Đăng ký xác thực
              </button>
              <button 
                className="popup-close-btn" 
                onClick={() => setShowVerificationPopup(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProducerDashboard;

