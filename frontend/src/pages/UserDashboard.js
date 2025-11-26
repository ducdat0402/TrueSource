import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI, userAPI } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import './UserDashboard.css';

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

function UserDashboard() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    // Initialize Socket.io
    initSocket(token);
    const socket = getSocket();

    // Listen for product updates
    socket.on('product-updated', (data) => {
      if (selectedProduct && data.productId === selectedProduct.id) {
        loadHistory(data.productId);
      }
      loadProducts();
    });

    socket.on('product-status-changed', (data) => {
      if (selectedProduct && data.productId === selectedProduct.id) {
        loadProduct(data.productId);
      }
    });

    loadProducts();

    return () => {
      socket.off('product-updated');
      socket.off('product-status-changed');
    };
  }, [navigate, selectedProduct]);

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProduct = async (id) => {
    try {
      const response = await productAPI.getById(id);
      setSelectedProduct(response.data);
    } catch (error) {
      console.error('Error loading product:', error);
    }
  };

  const loadHistory = async (id) => {
    try {
      const response = await productAPI.getHistory(id);
      setHistory(response.data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    loadHistory(product.id);
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <h1>Bảng Điều Khiển TrueSource</h1>
        <div className="user-info">
          <span>Xin chào, {user?.username || 'Người dùng'}</span>
          {user?.role === 'consumer' && (
            <button onClick={() => navigate('/scan')} className="scan-button">
              Quét QR Code
            </button>
          )}
          <button onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
          }}>Đăng xuất</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="products-section">
          <h2>Sản Phẩm</h2>
          <div className="products-grid">
            {products.map(product => (
              <div
                key={product.id}
                className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                onClick={() => handleProductClick(product)}
              >
                <h3>Sản phẩm #{product.id}</h3>
                <p><strong>Xuất xứ:</strong> {product.origin}</p>
                <p><strong>Trạng thái:</strong> <span className={`status status-${product.currentStatus?.toLowerCase()}`}>{getStatusLabel(product.currentStatus)}</span></p>
                <p><strong>Ngày tạo:</strong> {new Date(product.createdAt * 1000).toLocaleDateString('vi-VN')}</p>
              </div>
            ))}
            {products.length === 0 && (
              <p className="no-products">Không tìm thấy sản phẩm</p>
            )}
          </div>
        </div>

        {selectedProduct && (
          <div className="product-details">
            <h2>Chi Tiết Sản Phẩm - #{selectedProduct.id}</h2>
            <div className="details-card">
              <div className="detail-item">
                <strong>Xuất xứ:</strong> {selectedProduct.origin}
              </div>
              <div className="detail-item">
                <strong>Trạng thái:</strong> <span className={`status status-${selectedProduct.currentStatus?.toLowerCase()}`}>{getStatusLabel(selectedProduct.currentStatus)}</span>
              </div>
              <div className="detail-item">
                <strong>Mã QR Hash:</strong> {selectedProduct.qrCodeHash}
              </div>
              {selectedProduct.producerAddress && (
                <div className="detail-item">
                  <strong>Địa chỉ nhà sản xuất:</strong> 
                  <span className="producer-address">{selectedProduct.producerAddress}</span>
                </div>
              )}
              <div className="detail-item">
                <strong>Ngày tạo:</strong> {new Date(selectedProduct.createdAt * 1000).toLocaleString('vi-VN')}
              </div>
            </div>

            {history && (
              <div className="history-section">
                <h3>Lịch Sử</h3>
                <div className="history-list">
                  {history.events && history.events.map((event, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-header">
                        <span className="event-type">{getEventTypeLabel(event.eventType)}</span>
                        <span className="event-time">{new Date(event.timestamp * 1000).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="event-details">
                        <p><strong>Địa điểm:</strong> {event.location}</p>
                        <p><strong>Chi tiết:</strong> {event.details}</p>
                        <p><strong>Người ký:</strong> {event.signer}</p>
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
                  {(!history.events || history.events.length === 0) && (
                    <p className="no-history">Chưa có lịch sử</p>
                  )}
                </div>
              </div>
            )}

            {selectedProduct.aiResults && Object.keys(selectedProduct.aiResults).length > 0 && (
              <div className="ai-results-section">
                <h3>Kết Quả Phân Tích AI</h3>
                {Object.entries(selectedProduct.aiResults).map(([key, result]) => (
                  <div key={key} className="ai-result-card">
                    <p><strong>Tính xác thực:</strong> {result.authenticity === 'Verified' ? 'Đã xác thực' : result.authenticity === 'Suspicious' ? 'Đáng nghi' : result.authenticity}</p>
                    <p><strong>Độ tin cậy:</strong> {result.confidence}%</p>
                    <p><strong>Phân tích:</strong> {result.analysis}</p>
                    <p><strong>Thời gian:</strong> {new Date(result.timestamp).toLocaleString('vi-VN')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;

