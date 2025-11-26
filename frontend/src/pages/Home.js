import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { productAPI } from '../services/api';
import './Home.css';

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

function Home() {
  const [qrCode, setQrCode] = useState('');
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState(null);
  const [blockchainInfo, setBlockchainInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(false);
  const html5QrCodeRef = useRef(null);
  const navigate = useNavigate();

  // Function to load product by QR code or ID
  const loadProduct = async (qrValue) => {
    if (!qrValue || !qrValue.trim()) {
      setError('Vui lòng nhập mã QR hoặc Product ID');
      return;
    }

    setLoading(true);
    setError('');
    setProduct(null);
    setHistory(null);

    try {
      // Try to get product by QR hash or ID
      let productData = null;
      try {
        const response = await productAPI.getById(qrValue);
        productData = response.data;
      } catch (err) {
        // Try trace endpoint
        try {
          const encodedValue = encodeURIComponent(qrValue);
          const traceResponse = await fetch(`http://localhost:3000/user/trace/${encodedValue}`);
          const traceData = await traceResponse.json();
          
          if (traceData.success && traceData.product) {
            productData = traceData.product;
          } else {
            throw new Error(traceData.error || 'Không tìm thấy sản phẩm');
          }
        } catch (traceErr) {
          throw new Error('Không tìm thấy sản phẩm. Mã QR không hợp lệ hoặc sản phẩm không tồn tại trong hệ thống.');
        }
      }

      setProduct(productData);

      // Use events from MongoDB (has txHash) instead of blockchain history
      // Blockchain history doesn't have txHash for individual events
      if (productData && productData.events && productData.events.length > 0) {
        setHistory({ events: productData.events });
      } else {
        // Fallback to blockchain history if MongoDB events not available
        try {
          const traceResponse = await fetch(`http://localhost:3000/user/trace/${productData.id}`);
          const traceData = await traceResponse.json();
          if (traceData.success) {
            if (traceData.history) {
              setHistory(traceData.history);
            }
            if (traceData.blockchainInfo) {
              setBlockchainInfo(traceData.blockchainInfo);
            }
          }
        } catch (err) {
          console.error('Error loading trace data:', err);
          // Fallback: try to get history only
          try {
            const historyResponse = await productAPI.getHistory(productData.id);
            setHistory(historyResponse.data);
          } catch (historyErr) {
            console.error('Error loading history:', historyErr);
            setHistory({ events: [] });
          }
        }
      }

      // Get blockchain info separately (for product creation txHash)
      if (productData && productData.id) {
        try {
          const traceResponse = await fetch(`http://localhost:3000/user/trace/${productData.id}`);
          const traceData = await traceResponse.json();
          if (traceData.success && traceData.blockchainInfo) {
            setBlockchainInfo(traceData.blockchainInfo);
          }
        } catch (err) {
          console.warn('Could not load blockchain info:', err);
        }
      }
    } catch (err) {
      setError(err.message || 'Không tìm thấy sản phẩm. Vui lòng kiểm tra lại mã QR.');
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
      setCameraPermission(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera.');
      setScanning(false);
      setCameraPermission(false);
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
    setCameraPermission(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        stopScanner();
      }
    };
  }, []);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>TrueSource</h1>
        <p className="tagline">Truy xuất nguồn gốc sản phẩm minh bạch</p>
        <div className="header-actions">
          <button 
            className="producer-login-btn"
            onClick={() => navigate('/producer/login')}
          >
            Đăng nhập
          </button>
        </div>
      </header>

      <div className="home-content">
        <div className="qr-section">
          <h2>Quét QR Code hoặc Nhập Mã Sản Phẩm</h2>
          
          {/* QR Scanner */}
          <div style={{marginBottom: '20px'}}>
            {!scanning ? (
              <button 
                onClick={startScanner}
                className="scan-button"
                style={{width: '100%', marginBottom: '15px'}}
              >
                📷 Bật Camera Quét QR
              </button>
            ) : (
              <div style={{textAlign: 'center', marginBottom: '15px'}}>
                <div id="qr-reader" style={{width: '100%', maxWidth: '400px', margin: '0 auto'}}></div>
                <button 
                  onClick={stopScanner}
                  className="scan-button"
                  style={{marginTop: '15px', backgroundColor: '#dc3545'}}
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
              <input
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Nhập mã QR hoặc Product ID"
                className="qr-input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="scan-button">
              {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm sản phẩm'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>

        {product && (
          <div className="product-details-section">
            <h2>Thông Tin Sản Phẩm</h2>
            
            <div className="product-card">
              <div className="product-header">
                <h3>Sản phẩm #{product.id}</h3>
                <span className={`status-badge status-${product.currentStatus?.toLowerCase()}`}>
                  {getStatusLabel(product.currentStatus)}
                </span>
              </div>

              <div className="product-info-grid">
                <div className="info-item">
                  <label>Xuất xứ:</label>
                  <span>{product.origin}</span>
                </div>
                <div className="info-item">
                  <label>Mã QR:</label>
                  <span className="qr-hash">{product.qrCodeHash}</span>
                </div>
                {product.producerAddress && (
                  <div className="info-item">
                    <label>Nhà sản xuất:</label>
                    <span className="producer-address">{product.producerAddress}</span>
                  </div>
                )}
                <div className="info-item">
                  <label>Ngày tạo:</label>
                  <span>{new Date(product.createdAt * 1000).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>

            {/* Lịch sử vận chuyển */}
            {history && history.events && history.events.length > 0 && (
              <div className="history-section">
                <h3>Lịch Sử Vận Chuyển</h3>
                <div className="timeline">
                  {history.events.map((event, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="event-header">
                          <span className="event-type">{getEventTypeLabel(event.eventType)}</span>
                          <span className="event-time">
                            {new Date(event.timestamp * 1000).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className="event-details">
                          <p><strong>Địa điểm:</strong> {event.location}</p>
                          <p><strong>Chi tiết:</strong> {event.details}</p>
                          {event.signer && (
                            <p><strong>Người ký:</strong> <span className="signer-address">{event.signer}</span></p>
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Xác thực Blockchain */}
            <div className="blockchain-verification">
              <h3>Xác Thực Blockchain</h3>
              <div className="verification-card">
                <div className="verification-item">
                  <label>Trạng thái:</label>
                  <span className="verified-badge">✓ Đã xác thực trên Blockchain</span>
                </div>
                <div className="verification-item">
                  <label>Mạng:</label>
                  <span>Sepolia Testnet</span>
                </div>
                {blockchainInfo && (
                  <>
                    <div className="verification-item">
                      <label>Mã giao dịch:</label>
                      <span className="tx-hash">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${blockchainInfo.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {blockchainInfo.txHash}
                        </a>
                      </span>
                    </div>
                    {blockchainInfo.blockNumber && (
                      <div className="verification-item">
                        <label>Số khối:</label>
                        <span>
                          <a 
                            href={`https://sepolia.etherscan.io/block/${blockchainInfo.blockNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {blockchainInfo.blockNumber}
                          </a>
                        </span>
                      </div>
                    )}
                    {blockchainInfo.timestamp && (
                      <div className="verification-item">
                        <label>Ngày ghi:</label>
                        <span>{new Date(blockchainInfo.timestamp * 1000).toLocaleString('vi-VN')}</span>
                      </div>
                    )}
                    {blockchainInfo.confirmations !== null && (
                      <div className="verification-item">
                        <label>Số xác nhận:</label>
                        <span>{blockchainInfo.confirmations}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="verification-note">
                  <p>Thông tin sản phẩm đã được ghi nhận trên blockchain Ethereum, đảm bảo tính minh bạch và không thể thay đổi.</p>
                </div>
              </div>
            </div>

            {/* AI Analysis Results */}
            {product.aiResults && Object.keys(product.aiResults).length > 0 && (
              <div className="ai-results-section">
                <h3>Kết Quả Phân Tích AI</h3>
                {Object.entries(product.aiResults).map(([key, result]) => (
                  <div key={key} className="ai-result-card">
                    <div className="ai-header">
                      <span className={`authenticity-badge authenticity-${result.authenticity?.toLowerCase()}`}>
                        {result.authenticity === 'Verified' ? 'Đã xác thực' : result.authenticity === 'Suspicious' ? 'Đáng nghi' : result.authenticity}
                      </span>
                      <span className="confidence">Độ tin cậy: {result.confidence}%</span>
                    </div>
                    <p className="ai-analysis">{result.analysis}</p>
                    <p className="ai-timestamp">
                      Phân tích lúc: {new Date(result.timestamp).toLocaleString('vi-VN')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="scan-again-btn"
              onClick={() => {
                setProduct(null);
                setHistory(null);
                setBlockchainInfo(null);
                setQrCode('');
              }}
            >
              Quét mã khác
            </button>
          </div>
        )}

        {!product && !loading && (
          <div className="info-section">
            <h2>Về TrueSource</h2>
            <div className="info-cards">
              <div className="info-card">
                <h4>🔍 Truy Xuất Nguồn Gốc</h4>
                <p>Xem thông tin chi tiết về nguồn gốc và lịch sử vận chuyển của sản phẩm</p>
              </div>
              <div className="info-card">
                <h4>⛓️ Blockchain</h4>
                <p>Dữ liệu được lưu trữ trên blockchain, đảm bảo tính minh bạch và không thể thay đổi</p>
              </div>
              <div className="info-card">
                <h4>🤖 AI Verification</h4>
                <p>Phân tích AI tự động để xác thực tính xác thực của sản phẩm</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;

