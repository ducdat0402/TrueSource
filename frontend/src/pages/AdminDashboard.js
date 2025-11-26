import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { initSocket, getSocket } from '../services/socket';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function AdminDashboard() {
  const [charts, setCharts] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'verifications'
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
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
      navigate('/login');
      return;
    }

    // Initialize Socket.io
    initSocket(token);
    const socket = getSocket();

    // Listen for real-time events
    socket.on('product-created', (data) => {
      setRealtimeUpdates(prev => [...prev, { type: 'Sản phẩm đã tạo', data, time: new Date() }]);
      loadCharts(); // Refresh charts
    });

    socket.on('product-updated', (data) => {
      setRealtimeUpdates(prev => [...prev, { type: 'Sản phẩm đã cập nhật', data, time: new Date() }]);
      loadCharts();
    });

    socket.on('ai-analysis-completed', (data) => {
      setRealtimeUpdates(prev => [...prev, { type: 'Phân tích AI hoàn thành', data, time: new Date() }]);
      loadCharts();
    });

    loadData();

    return () => {
      socket.off('product-created');
      socket.off('product-updated');
      socket.off('ai-analysis-completed');
    };
  }, [navigate]);

  // Load pending verifications when tab is active
  useEffect(() => {
    if (activeTab === 'verifications') {
      loadPendingVerifications();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [chartsRes, analyticsRes] = await Promise.all([
        adminAPI.getCharts(),
        adminAPI.getAnalytics()
      ]);
      setCharts(chartsRes.data.charts);
      // getAnalytics returns { success: true, analytics: {...} }
      setAnalytics(analyticsRes.data.analytics || analyticsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error details:', error.response?.data || error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const loadCharts = async () => {
    try {
      const response = await adminAPI.getCharts();
      setCharts(response.data.charts);
    } catch (error) {
      console.error('Error loading charts:', error);
    }
  };

  const loadPendingVerifications = async () => {
    setLoadingVerifications(true);
    try {
      const response = await adminAPI.getPendingVerifications(1, 50);
      setPendingVerifications(response.data.verifications || []);
    } catch (error) {
      console.error('Error loading pending verifications:', error);
      showPopup('Lỗi khi tải danh sách đơn xác thực: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoadingVerifications(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    
    setProcessing(true);
    try {
      await adminAPI.approveVerification(selectedVerification._id, adminNotes);
      setShowApproveModal(false);
      setSelectedVerification(null);
      setAdminNotes('');
      showPopup('Đã phê duyệt producer thành công!', 'success');
      loadPendingVerifications();
    } catch (error) {
      console.error('Error approving verification:', error);
      showPopup('Lỗi khi phê duyệt: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !adminNotes.trim()) {
      showPopup('Vui lòng nhập lý do từ chối', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      await adminAPI.rejectVerification(selectedVerification._id, adminNotes);
      setShowRejectModal(false);
      setSelectedVerification(null);
      setAdminNotes('');
      showPopup('Đã từ chối producer', 'success');
      loadPendingVerifications();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      showPopup('Lỗi khi từ chối: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const openApproveModal = (verification) => {
    setSelectedVerification(verification);
    setAdminNotes('');
    setShowApproveModal(true);
  };

  const openRejectModal = (verification) => {
    setSelectedVerification(verification);
    setAdminNotes('');
    setShowRejectModal(true);
  };

  const openLicenseModal = (businessLicense) => {
    setSelectedLicense(businessLicense);
    setShowLicenseModal(true);
  };

  const isBase64Image = (str) => {
    return str && (str.startsWith('data:image/') || str.startsWith('data:application/pdf'));
  };

  const getFileType = (str) => {
    if (!str) return null;
    if (str.startsWith('data:image/')) {
      return 'image';
    } else if (str.startsWith('data:application/pdf')) {
      return 'pdf';
    }
    return 'url';
  };

  if (loading) {
    return <div className="loading">Đang tải bảng điều khiển...</div>;
  }

  if (!charts) {
    return (
      <div className="error">
        <p>Không thể tải dữ liệu bảng điều khiển</p>
        <p>Vui lòng kiểm tra console trình duyệt để xem chi tiết</p>
        <button onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Bảng Điều Khiển Quản Trị</h1>
        <div className="header-actions">
          <div className="tabs">
            <button 
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={activeTab === 'verifications' ? 'active' : ''}
              onClick={() => setActiveTab('verifications')}
            >
              Phê Duyệt Producer
              {pendingVerifications.length > 0 && (
                <span className="badge">{pendingVerifications.length}</span>
              )}
            </button>
          </div>
          <button onClick={() => {
            localStorage.removeItem('token');
            navigate('/producer/login');
          }}>Đăng xuất</button>
        </div>
      </header>

      <div className="dashboard-content">
        {activeTab === 'verifications' ? (
          <div className="verifications-section">
            <div className="section-header">
              <h2>Danh Sách Đơn Đăng Ký Xác Thực Producer</h2>
              <button onClick={loadPendingVerifications} disabled={loadingVerifications}>
                {loadingVerifications ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>

            {loadingVerifications ? (
              <div className="loading">Đang tải danh sách...</div>
            ) : pendingVerifications.length === 0 ? (
              <div className="empty-state">
                <p>Không có đơn nào đang chờ phê duyệt</p>
              </div>
            ) : (
              <div className="verifications-list">
                {pendingVerifications.map((verification) => (
                  <div key={verification._id} className="verification-card">
                    <div className="verification-header">
                      <div className="verification-info">
                        <h3>{verification.companyName}</h3>
                        <p className="submitted-date">
                          Đăng ký: {new Date(verification.submittedAt || verification.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <div className="verification-actions">
                        <button 
                          className="btn-approve"
                          onClick={() => openApproveModal(verification)}
                        >
                          Phê Duyệt
                        </button>
                        <button 
                          className="btn-reject"
                          onClick={() => openRejectModal(verification)}
                        >
                          Từ Chối
                        </button>
                      </div>
                    </div>
                    
                    <div className="verification-details">
                      <div className="detail-row">
                        <div className="detail-item">
                          <label>Họ tên:</label>
                          <span>{verification.fullName}</span>
                        </div>
                        <div className="detail-item">
                          <label>Email:</label>
                          <span>{verification.email}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-item">
                          <label>Số điện thoại:</label>
                          <span>{verification.phone || verification.phoneNumber}</span>
                        </div>
                        <div className="detail-item">
                          <label>Mã số thuế:</label>
                          <span>{verification.taxId}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-item">
                          <label>Địa chỉ trụ sở:</label>
                          <span>{verification.address}</span>
                        </div>
                        <div className="detail-item">
                          <label>Địa chỉ ví:</label>
                          <span className="wallet-address">{verification.walletAddress}</span>
                        </div>
                      </div>
                      <div className="detail-row">
                        <div className="detail-item full-width">
                          <label>Giấy phép kinh doanh:</label>
                          <span>
                            {verification.businessLicense ? (
                              <button 
                                className="btn-view-license"
                                onClick={() => openLicenseModal(verification.businessLicense)}
                              >
                                📄 Xem tài liệu
                              </button>
                            ) : (
                              'Chưa có'
                            )}
                          </span>
                        </div>
                      </div>
                      {verification.userId && (
                        <div className="detail-row">
                          <div className="detail-item">
                            <label>Username:</label>
                            <span>{verification.userId.username || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <label>Trạng thái hiện tại:</label>
                            <span className={`status-badge ${verification.userId.verificationStatus || 'unverified'}`}>
                              {verification.userId.verificationStatus === 'pending' ? 'Đang chờ' : 
                               verification.userId.verificationStatus === 'verified' ? 'Đã xác thực' :
                               verification.userId.verificationStatus === 'rejected' ? 'Đã từ chối' : 'Chưa xác thực'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Real-time Updates */}
        <div className="realtime-updates">
          <h2>Cập Nhật Theo Thời Gian Thực</h2>
          <div className="updates-list">
            {realtimeUpdates.slice(-5).reverse().map((update, idx) => (
              <div key={idx} className="update-item">
                <span className="update-type">{update.type}</span>
                <span className="update-time">{update.time.toLocaleTimeString()}</span>
              </div>
            ))}
            {realtimeUpdates.length === 0 && (
              <p className="no-updates">Chưa có cập nhật nào</p>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Products by Status */}
          <div className="chart-card">
            <h3>Sản Phẩm Theo Trạng Thái</h3>
            <Bar
              data={{
                labels: charts.productsByStatus.labels,
                datasets: [{
                  label: 'Products',
                  data: charts.productsByStatus.data,
                  backgroundColor: 'rgba(102, 126, 234, 0.6)'
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          </div>

          {/* Products Over Time */}
          <div className="chart-card">
            <h3>Sản Phẩm Đã Tạo (30 Ngày Qua)</h3>
            <Line
              data={{
                labels: charts.productsOverTime.labels,
                datasets: [{
                  label: 'Products',
                  data: charts.productsOverTime.data,
                  borderColor: 'rgba(102, 126, 234, 1)',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)'
                }]
              }}
              options={{
                responsive: true
              }}
            />
          </div>

          {/* Transaction Types */}
          <div className="chart-card">
            <h3>Loại Giao Dịch</h3>
            <Doughnut
              data={{
                labels: charts.transactionTypes.labels,
                datasets: [{
                  data: charts.transactionTypes.data,
                  backgroundColor: [
                    'rgba(102, 126, 234, 0.6)',
                    'rgba(118, 75, 162, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                  ]
                }]
              }}
              options={{
                responsive: true
              }}
            />
          </div>

          {/* AI Results */}
          <div className="chart-card">
            <h3>Kết Quả Phân Tích AI</h3>
            <Pie
              data={{
                labels: charts.aiResults.labels,
                datasets: [{
                  data: charts.aiResults.data,
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                  ]
                }]
              }}
              options={{
                responsive: true
              }}
            />
          </div>
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="analytics-summary">
            <h2>Tóm Tắt Phân Tích</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <h4>Tổng Sản Phẩm</h4>
                <p>{analytics.products?.total || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Tổng Người Dùng</h4>
                <p>{analytics.users?.total || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Sản Phẩm Gần Đây (7 ngày)</h4>
                <p>{analytics.products?.recent || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Sản Phẩm Có AI</h4>
                <p>{analytics.products?.withAI || 0}</p>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedVerification && (
          <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Phê Duyệt Producer</h3>
                <button className="modal-close" onClick={() => setShowApproveModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Bạn có chắc chắn muốn phê duyệt đơn đăng ký xác thực của:</p>
                <div className="verification-summary">
                  <p><strong>Công ty:</strong> {selectedVerification.companyName}</p>
                  <p><strong>Người đại diện:</strong> {selectedVerification.fullName}</p>
                  <p><strong>Email:</strong> {selectedVerification.email}</p>
                  <p><strong>Địa chỉ ví:</strong> {selectedVerification.walletAddress}</p>
                </div>
                <div className="form-group">
                  <label>Ghi chú (tùy chọn):</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Nhập ghi chú nếu có..."
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowApproveModal(false)}
                  disabled={processing}
                >
                  Hủy
                </button>
                <button 
                  className="btn-approve" 
                  onClick={handleApprove}
                  disabled={processing}
                >
                  {processing ? 'Đang xử lý...' : 'Xác nhận phê duyệt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedVerification && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Từ Chối Producer</h3>
                <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Bạn có chắc chắn muốn từ chối đơn đăng ký xác thực của:</p>
                <div className="verification-summary">
                  <p><strong>Công ty:</strong> {selectedVerification.companyName}</p>
                  <p><strong>Người đại diện:</strong> {selectedVerification.fullName}</p>
                  <p><strong>Email:</strong> {selectedVerification.email}</p>
                </div>
                <div className="form-group">
                  <label>Lý do từ chối <span className="required">*</span>:</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Nhập lý do từ chối..."
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing}
                >
                  Hủy
                </button>
                <button 
                  className="btn-reject" 
                  onClick={handleReject}
                  disabled={processing || !adminNotes.trim()}
                >
                  {processing ? (
                    <>
                      <span className="loading-spinner"></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận từ chối'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* License View Modal */}
        {showLicenseModal && selectedLicense && (
          <div className="modal-overlay" onClick={() => setShowLicenseModal(false)}>
            <div className="modal-content license-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Giấy Phép Kinh Doanh</h3>
                <button className="modal-close" onClick={() => setShowLicenseModal(false)}>×</button>
              </div>
              <div className="modal-body license-viewer">
                {getFileType(selectedLicense) === 'image' ? (
                  <img 
                    src={selectedLicense} 
                    alt="Giấy phép kinh doanh" 
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                ) : getFileType(selectedLicense) === 'pdf' ? (
                  <iframe
                    src={selectedLicense}
                    style={{ width: '100%', height: '600px', border: 'none' }}
                    title="Giấy phép kinh doanh PDF"
                  />
                ) : (
                  <div>
                    <p>Không thể hiển thị file này. Vui lòng tải xuống để xem.</p>
                    <a 
                      href={selectedLicense} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-download"
                    >
                      Tải xuống
                    </a>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowLicenseModal(false)}
                >
                  Đóng
                </button>
                {selectedLicense && (
                  <a
                    href={selectedLicense}
                    download="giay-phep-kinh-doanh"
                    className="btn-download-link"
                  >
                    <button className="btn-approve">
                      Tải xuống
                    </button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}

export default AdminDashboard;

