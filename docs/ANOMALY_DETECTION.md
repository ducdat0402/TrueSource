# Anomaly Detection Feature - Phát Hiện Bất Thường Trong Chuỗi Cung Ứng

## Tổng Quan

Tính năng Anomaly Detection tự động phân tích các sản phẩm trong hệ thống để phát hiện các dấu hiệu bất thường trong chuỗi cung ứng. Tính năng này giúp:
- Phát hiện sớm hàng giả, hàng nhái
- Cảnh báo về các bất thường trong quá trình vận chuyển
- Tăng độ tin cậy của hệ thống

## Cách Hoạt Động

### 1. Tự Động Kích Hoạt
- Tính năng tự động chạy khi sản phẩm được cập nhật (khi có event mới từ blockchain)
- Được trigger trong `backend/src/app.js` khi nhận được `ProductUpdated` event

### 2. Phân Tích Pattern

#### a. Phân Tích Thời Gian (Time Pattern Analysis)
- Phát hiện thời gian giữa các events quá ngắn (< 1 giờ) - có thể là lỗi hoặc gian lận
- Phát hiện thời gian quá dài (> 30 ngày) - có thể là sản phẩm bị bỏ quên
- Phát hiện outliers - thời gian khác biệt đáng kể so với trung bình

#### b. Phân Tích Sequence Status (Status Sequence Analysis)
- Kiểm tra tính hợp lệ của chuỗi trạng thái:
  - `Created` → `In Transit` / `Shipped` / `Approved`
  - `Approved` → `Shipped` / `In Transit`
  - `Shipped` → `In Transit` / `At Warehouse`
  - `In Transit` → `At Warehouse` / `In Customs` / `Delivered`
  - `At Warehouse` → `In Transit` / `In Customs` / `Delivered`
  - `In Customs` → `In Transit` / `Delivered`
  - `Delivered` → `Completed`
- Phát hiện status quay ngược (ví dụ: `Delivered` → `In Transit`)

#### c. Phân Tích Địa Điểm (Location Pattern Analysis)
- Phát hiện địa điểm trùng lặp liên tiếp
- Phát hiện di chuyển không hợp lý (ví dụ: từ Việt Nam sang Mỹ trong 1 giờ)

### 3. Tính Toán Anomaly Score

Anomaly Score được tính dựa trên:
- **Time Analysis**: 40% trọng số
- **Status Analysis**: 40% trọng số  
- **Location Analysis**: 20% trọng số

**Severity Levels:**
- **High** (Score > 70): Nhiều dấu hiệu bất thường nghiêm trọng
- **Medium** (Score 40-70): Có một số dấu hiệu bất thường
- **Low** (Score < 40): Ít hoặc không có dấu hiệu bất thường

**Authenticity:**
- **Verified**: Score < 40, không có anomalies
- **Warning**: Score 40-70, có một số anomalies
- **Suspicious**: Score > 70, nhiều anomalies nghiêm trọng

## API Endpoints

### 1. Tự Động Phân Tích
```
POST /admin/analyze-product/:id
```
Trigger phân tích thủ công cho một sản phẩm

### 2. Xem Danh Sách Anomalies
```
GET /admin/anomalies?page=1&limit=20&severity=high
```
Query Parameters:
- `page`: Số trang (default: 1)
- `limit`: Số items mỗi trang (default: 20)
- `severity`: Lọc theo mức độ (high/medium/low)

### 3. Xem AI Results
```
GET /admin/ai-results?page=1&limit=10
```

## Frontend Integration

### Trang Home (User)
- Hiển thị anomaly warnings khi user quét QR code
- Hiển thị chi tiết các anomalies phát hiện được
- Hiển thị anomaly score và severity

### Admin Dashboard
- Có thể xem danh sách tất cả sản phẩm có anomalies
- Filter theo severity
- Xem chi tiết từng anomaly

## Cấu Trúc Dữ Liệu

### AI Result Structure
```javascript
{
  authenticity: "Verified" | "Warning" | "Suspicious",
  confidence: 0-100,
  analysis: "Mô tả phân tích",
  timestamp: 1234567890,
  anomalyScore: 0-100,
  severity: "low" | "medium" | "high",
  anomalies: [
    {
      type: "time_too_fast" | "time_too_slow" | "time_outlier" | 
            "invalid_status_sequence" | "status_regression" |
            "duplicate_location" | "impossible_travel",
      severity: "low" | "medium" | "high",
      message: "Mô tả chi tiết",
      eventIndex: 1
    }
  ],
  details: {
    timeAnalysis: { score: 0-100, anomalyCount: 0 },
    statusAnalysis: { score: 0-100, anomalyCount: 0 },
    locationAnalysis: { score: 0-100, anomalyCount: 0 }
  }
}
```

## Cải Tiến Tương Lai

1. **Tích hợp OpenAI API**: Sử dụng GPT để phân tích và tạo mô tả chi tiết hơn
2. **Machine Learning Model**: Train model riêng dựa trên dữ liệu lịch sử
3. **Geolocation API**: Sử dụng API thực tế để tính khoảng cách địa lý chính xác
4. **Real-time Alerts**: Gửi cảnh báo real-time khi phát hiện anomalies nghiêm trọng
5. **Historical Analysis**: Phân tích pattern theo thời gian để phát hiện trends

## Testing

Để test tính năng:
1. Tạo một sản phẩm với events có thời gian bất thường
2. Tạo events với status sequence không hợp lý
3. Trigger AI analysis: `POST /admin/analyze-product/:id`
4. Kiểm tra kết quả trong response và database

## Files Liên Quan

- `backend/src/services/aiService.js`: Logic phân tích chính
- `backend/src/controllers/adminController.js`: API endpoints
- `backend/src/routes/adminRoutes.js`: Route definitions
- `frontend/src/pages/Home.js`: Hiển thị trên trang user
- `frontend/src/pages/Home.css`: Styling cho anomaly warnings

