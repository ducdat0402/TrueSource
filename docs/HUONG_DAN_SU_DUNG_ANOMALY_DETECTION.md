# Hướng Dẫn Sử Dụng Tính Năng Anomaly Detection

## 📋 Tổng Quan

Tính năng **Anomaly Detection** tự động phân tích sản phẩm để phát hiện các dấu hiệu bất thường trong chuỗi cung ứng. Tính năng này hoạt động theo 2 cách:

1. **Tự động**: Chạy tự động khi sản phẩm được cập nhật
2. **Thủ công**: Admin có thể trigger phân tích cho bất kỳ sản phẩm nào

---

## 🚀 Cách 1: Tự Động (Không Cần Làm Gì)

### Khi Nào Tự Động Chạy?
- ✅ Khi Producer cập nhật trạng thái sản phẩm trên blockchain
- ✅ Khi có event mới từ smart contract (`ProductUpdated`)
- ✅ Hệ thống tự động phân tích và lưu kết quả vào database

### Xem Kết Quả Ở Đâu?
1. **Trang Home (User)**: 
   - Quét QR code của sản phẩm
   - Scroll xuống phần "🔍 Phân Tích AI & Phát Hiện Bất Thường"
   - Xem anomaly score, warnings, và chi tiết

2. **Admin Dashboard**:
   - Xem trong charts "Kết Quả Phân Tích AI"
   - Xem trong analytics summary

---

## 🎯 Cách 2: Trigger Thủ Công (Admin)

### Bước 1: Đăng Nhập Vào Admin Dashboard
1. Truy cập: `http://localhost:3001/producer/login`
2. Đăng nhập với tài khoản có role `admin`

### Bước 2: Trigger AI Analysis Cho Sản Phẩm

#### Option A: Qua API (Postman/Thunder Client)

```bash
POST http://localhost:3000/admin/analyze-product/:id
Authorization: Bearer <admin_token>
```

**Ví dụ:**
```bash
POST http://localhost:3000/admin/analyze-product/18
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "AI analysis completed",
  "aiResult": {
    "authenticity": "Warning",
    "confidence": 65,
    "anomalyScore": 45,
    "severity": "medium",
    "anomalies": [
      {
        "type": "time_too_fast",
        "severity": "high",
        "message": "Thời gian giữa Shipment và Warehouse quá ngắn (0.5 giờ)"
      }
    ],
    "details": {
      "timeAnalysis": { "score": 30, "anomalyCount": 1 },
      "statusAnalysis": { "score": 0, "anomalyCount": 0 },
      "locationAnalysis": { "score": 15, "anomalyCount": 1 }
    }
  },
  "product": { ... }
}
```

#### Option B: Qua Frontend (Sẽ thêm button vào Admin Dashboard)

---

## 📊 Cách 3: Xem Danh Sách Tất Cả Anomalies

### Qua API:

```bash
GET http://localhost:3000/admin/anomalies?page=1&limit=20&severity=high
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số items mỗi trang (default: 20)
- `severity`: Lọc theo mức độ (`high`, `medium`, `low`)

**Ví dụ:**
```bash
# Xem tất cả anomalies
GET http://localhost:3000/admin/anomalies

# Chỉ xem anomalies nghiêm trọng
GET http://localhost:3000/admin/anomalies?severity=high

# Xem trang 2, mỗi trang 10 items
GET http://localhost:3000/admin/anomalies?page=2&limit=10
```

**Response:**
```json
{
  "success": true,
  "anomalies": [
    {
      "id": 18,
      "productName": "Cà phê Arabica",
      "origin": "Vietnam",
      "currentStatus": "In Transit",
      "anomalyScore": 65,
      "severity": "medium",
      "authenticity": "Warning",
      "anomalyCount": 3,
      "anomalies": [
        {
          "type": "time_too_fast",
          "severity": "high",
          "message": "Thời gian giữa Shipment và Warehouse quá ngắn (0.5 giờ)"
        }
      ],
      "timestamp": 1234567890
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

## 🔍 Cách 4: Xem Kết Quả AI Cho User (Public)

### Qua API (Không cần đăng nhập):

```bash
GET http://localhost:3000/user/products/:id/ai-insights
```

**Ví dụ:**
```bash
GET http://localhost:3000/user/products/18/ai-insights
```

**Response:**
```json
{
  "success": true,
  "productId": 18,
  "origin": "Vietnam",
  "status": "In Transit",
  "aiInsights": {
    "authenticity": "Warning",
    "confidence": 65,
    "riskLevel": "medium",
    "analysis": "Phân tích sản phẩm #18: Phát hiện 3 dấu hiệu bất thường...",
    "timestamp": 1234567890
  }
}
```

### Qua Frontend:
1. Truy cập trang Home: `http://localhost:3001/`
2. Quét QR code hoặc nhập Product ID
3. Scroll xuống phần "🔍 Phân Tích AI & Phát Hiện Bất Thường"

---

## 🧪 Test Cases

### Test Case 1: Sản Phẩm Bình Thường (Verified)

**Tạo sản phẩm với events hợp lệ:**
- Thời gian giữa events: 5-7 ngày
- Status sequence hợp lệ: Created → Approved → Shipped → In Transit → Delivered
- Địa điểm khác nhau và hợp lý

**Kỳ vọng:**
- Anomaly Score: < 40
- Authenticity: "Verified"
- Confidence: > 80%

### Test Case 2: Sản Phẩm Có Cảnh Báo (Warning)

**Tạo sản phẩm với một số bất thường:**
- Thời gian giữa 2 events quá ngắn (< 1 giờ)
- Địa điểm trùng lặp
- Thời gian giữa events hơi chậm (> 10 ngày)

**Kỳ vọng:**
- Anomaly Score: 40-70
- Authenticity: "Warning"
- Confidence: 50-60%
- Có 2-4 anomalies

---

## 📝 Ví Dụ Thực Tế

### Ví Dụ 1: Trigger AI Analysis Cho Sản Phẩm ID 18

```bash
# 1. Lấy admin token (đăng nhập trước)
POST http://localhost:3000/auth/login
Body: {
  "email": "admin@example.com",
  "password": "password123"
}

# 2. Copy token từ response
# Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Trigger AI analysis
POST http://localhost:3000/admin/analyze-product/18
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Ví Dụ 2: Xem Tất Cả Sản Phẩm Có Anomalies Nghiêm Trọng

```bash
GET http://localhost:3000/admin/anomalies?severity=high
Headers: {
  "Authorization": "Bearer <admin_token>"
}
```

### Ví Dụ 3: User Quét QR Code Và Xem Kết Quả

1. Mở trang Home: `http://localhost:3001/`
2. Nhập Product ID: `18` hoặc quét QR code
3. Click "Tìm kiếm sản phẩm"
4. Scroll xuống xem phần "🔍 Phân Tích AI & Phát Hiện Bất Thường"

---

## 🎨 Hiển Thị Kết Quả

### Trên Trang Home:
- **Verified**: Badge màu xanh lá với icon ✅
- **Warning**: Badge màu vàng với icon ⚠️
- **Suspicious**: Badge màu đỏ với icon ⚠️

### Anomaly Score:
- **0-40**: Low risk (màu xanh)
- **40-70**: Medium risk (màu vàng)
- **70-100**: High risk (màu đỏ)

### Chi Tiết Hiển Thị:
- Danh sách các anomalies phát hiện được
- Breakdown theo từng loại phân tích (Time/Status/Location)
- Timestamp của phân tích

---

## ❓ FAQ

### Q: Làm sao để test tính năng này?
A: 
1. Tạo sản phẩm với events bất thường (thời gian quá ngắn, status không hợp lệ)
2. Trigger AI analysis: `POST /admin/analyze-product/:id`
3. Xem kết quả trên trang Home hoặc qua API

### Q: Tính năng có tự động chạy không?
A: Có! Tự động chạy mỗi khi sản phẩm được update trên blockchain.

### Q: Làm sao để xem tất cả sản phẩm có anomalies?
A: Dùng API: `GET /admin/anomalies` (cần admin token)

### Q: User có thể xem kết quả không?
A: Có! User quét QR code sẽ thấy kết quả phân tích AI tự động.

### Q: Anomaly score được tính như thế nào?
A: 
- Time Analysis: 40%
- Status Analysis: 40%
- Location Analysis: 20%

---

## 🔧 Troubleshooting

### Vấn đề: Không thấy kết quả AI
**Giải pháp:**
1. Kiểm tra xem sản phẩm có events chưa (cần ít nhất 2 events)
2. Trigger thủ công: `POST /admin/analyze-product/:id`
3. Kiểm tra console backend xem có lỗi không

### Vấn đề: Anomaly score luôn là 0
**Giải pháp:**
- Đảm bảo sản phẩm có đủ events (ít nhất 2 events)
- Kiểm tra events có timestamp hợp lệ không

### Vấn đề: Không thể trigger AI analysis
**Giải pháp:**
- Kiểm tra đã đăng nhập với role admin chưa
- Kiểm tra token còn hợp lệ không
- Kiểm tra Product ID có tồn tại không

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Backend logs: `console.log` trong `aiService.js`
2. Database: Kiểm tra `aiResults` field trong Product collection
3. API response: Kiểm tra status code và error message




