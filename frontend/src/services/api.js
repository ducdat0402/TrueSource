import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  verifyWallet: (walletAddress) => api.post('/auth/verify-wallet', { walletAddress })
};

// Contract API
export const contractAPI = {
  getInfo: () => api.get('/contract/info')
};

// Product API
export const productAPI = {
  create: (data) => api.post('/products', data),
  getById: (id) => api.get(`/products/${id}`),
  getHistory: (id) => api.get(`/history/${id}`),
  getAll: () => api.get('/products')
};

// Admin API
export const adminAPI = {
  listUsers: (page = 1, limit = 10, search = '') => 
    api.get(`/admin/users?page=${page}&limit=${limit}&search=${search}`),
  grantRole: (userId, role) => 
    api.post(`/admin/users/${userId}/grant-role`, { role }),
  revokeRole: (userId) => 
    api.post(`/admin/users/${userId}/revoke-role`),
  approveProduct: (id, status) => 
    api.post(`/admin/products/${id}/approve`, { status }),
  triggerAIAnalysis: (id) => 
    api.post(`/admin/analyze-product/${id}`),
  getAnomalies: (page = 1, limit = 20, severity = '') => {
    const params = new URLSearchParams({ page, limit });
    if (severity) params.append('severity', severity);
    return api.get(`/admin/anomalies?${params.toString()}`);
  },
  getAIResults: (page = 1, limit = 10) => 
    api.get(`/admin/ai-results?page=${page}&limit=${limit}`),
  getAnalytics: () => 
    api.get('/admin/analytics'),
  getCharts: () => 
    api.get('/admin/analytics/charts'),
  getLogs: () => 
    api.get('/admin/logs'),
  // Producer Verification Management
  getPendingVerifications: (page = 1, limit = 10) => 
    api.get(`/admin/producers/pending?page=${page}&limit=${limit}`),
  approveVerification: (verificationId, adminNotes) => 
    api.post(`/admin/producers/${verificationId}/approve`, { adminNotes }),
  rejectVerification: (verificationId, adminNotes) => 
    api.post(`/admin/producers/${verificationId}/reject`, { adminNotes })
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getMyProducts: () => api.get('/user/products'),
  updateProductStatus: (id, data) => api.post(`/user/products/${id}/update-status`, data),
  // Producer Verification API
  registerVerification: (data) => api.post('/user/verification/register', data),
  getVerificationStatus: () => api.get('/user/verification/status')
};

export default api;

