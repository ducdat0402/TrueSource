import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { productAPI } from '../services/api';
import './QRScanner.css';

function QRScanner() {
  const [qrCode, setQrCode] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef(null);
  const navigate = useNavigate();

  // Function to load product by QR code or ID
  const loadProduct = async (qrValue) => {
    if (!qrValue || !qrValue.trim()) {
      setError('Vui lòng nhập mã QR');
      return;
    }

    setLoading(true);
    setError('');
    setProduct(null);

    try {
      // Try to get product by QR hash or ID
      try {
        const response = await productAPI.getById(qrValue);
        setProduct(response.data);
      } catch (err) {
        // Try trace endpoint
        try {
          const encodedValue = encodeURIComponent(qrValue);
          const traceResponse = await fetch(`http://localhost:3000/user/trace/${encodedValue}`);
          const traceData = await traceResponse.json();
          
          if (traceData.success && traceData.product) {
            setProduct(traceData.product);
          } else {
            setError(traceData.error || 'Không tìm thấy sản phẩm. Vui lòng kiểm tra lại mã QR.');
          }
        } catch (traceErr) {
          setError('Không tìm thấy sản phẩm. Mã QR không hợp lệ hoặc sản phẩm không tồn tại trong hệ thống.');
        }
      }
    } catch (traceErr) {
      setError('Không tìm thấy sản phẩm. Vui lòng kiểm tra lại mã QR.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    await loadProduct(qrCode);
  };

  // Start QR Scanner
  const startScanner = async () => {
    try {
      // Set scanning state first to render the element
      setScanning(true);
      setError('');

      // Wait a bit for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if element exists
      const element = document.getElementById("qr-reader");
      if (!element) {
        throw new Error("QR reader element not found");
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Successfully scanned
          stopScanner();
          loadProduct(decodedText);
        },
        (errorMessage) => {
          // Ignore errors (just keep scanning)
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.');
      setScanning(false);
    }
  };

  // Stop QR Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        stopScanner();
      }
    };
  }, []);

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

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-card">
        <h2>Quét QR Code</h2>
        <p className="scanner-description">
          Quét hoặc nhập mã QR để xem thông tin sản phẩm
        </p>

        {/* QR Scanner */}
        <div style={{marginBottom: '20px'}}>
          {!scanning ? (
            <button 
              onClick={startScanner}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              📷 Bật Camera Quét QR
            </button>
          ) : (
            <div style={{textAlign: 'center', marginBottom: '15px'}}>
              <div id="qr-reader" style={{width: '100%', maxWidth: '400px', margin: '0 auto'}}></div>
              <button 
                onClick={stopScanner}
                style={{
                  marginTop: '15px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Dừng Quét
              </button>
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div style={{textAlign: 'center', margin: '20px 0', color: '#666'}}>
          <span style={{display: 'block', marginBottom: '10px'}}>hoặc</span>
        </div>

        <form onSubmit={handleScan} className="qr-form">
          <div className="form-group">
            <label>Mã QR / ID Sản Phẩm</label>
            <input
              type="text"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="Nhập mã QR hoặc Product ID"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm sản phẩm'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {product && (
          <div className="product-result">
            <h3>Thông Tin Sản Phẩm</h3>
            <div className="product-details">
              <div className="detail-item">
                <strong>ID Sản phẩm:</strong> {product.id}
              </div>
              {product.productName && (
                <div className="detail-item">
                  <strong>Tên sản phẩm:</strong> {product.productName}
                </div>
              )}
              {product.category && (
                <div className="detail-item">
                  <strong>Loại sản phẩm:</strong> {product.category}
                </div>
              )}
              <div className="detail-item">
                <strong>Xuất xứ:</strong> {product.origin}
              </div>
              <div className="detail-item">
                <strong>Trạng thái:</strong> 
                <span className={`status status-${product.currentStatus?.toLowerCase()}`}>
                  {getStatusLabel(product.currentStatus)}
                </span>
              </div>
              {product.producerAddress && (
                <div className="detail-item">
                  <strong>Nhà sản xuất:</strong> 
                  <span className="producer-address">{product.producerAddress}</span>
                </div>
              )}
              <div className="detail-item">
                <strong>Ngày tạo:</strong> {new Date(product.createdAt * 1000).toLocaleString('vi-VN')}
              </div>

              {product.events && product.events.length > 0 && (
                <div className="history-section">
                  <h4>Lịch Sử</h4>
                  <div className="history-list">
                    {product.events.map((event, idx) => (
                      <div key={idx} className="history-item">
                        <div className="history-header">
                          <span className="event-type">{getEventTypeLabel(event.eventType)}</span>
                          <span className="event-time">
                            {new Date(event.timestamp * 1000).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className="event-details">
                          <p><strong>Địa điểm:</strong> {event.location}</p>
                          <p><strong>Chi tiết:</strong> {event.details}</p>
                          {event.signer && (
                            <p><strong>Người ký:</strong> {event.signer}</p>
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

              {product.aiResults && Object.keys(product.aiResults).length > 0 && (
                <div className="ai-results-section">
                  <h4>Phân Tích AI</h4>
                  {Object.entries(product.aiResults).map(([key, result]) => (
                    <div key={key} className="ai-result-card">
                      <p><strong>Tính xác thực:</strong> {result.authenticity === 'Verified' ? 'Đã xác thực' : result.authenticity === 'Suspicious' ? 'Đáng nghi' : result.authenticity}</p>
                      <p><strong>Độ tin cậy:</strong> {result.confidence}%</p>
                      <p><strong>Phân tích:</strong> {result.analysis}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button 
          className="back-button" 
          onClick={() => navigate('/dashboard')}
        >
          Về Bảng Điều Khiển
        </button>
      </div>
    </div>
  );
}

export default QRScanner;

