# 🚀 Hướng Dẫn Sử Dụng Anomaly Detection - Đơn Giản

## 📌 Cách Sử Dụng Nhanh

### ✅ Cách 1: Tự Động (Không Cần Làm Gì)

**Tính năng tự động chạy khi:**
- Producer cập nhật trạng thái sản phẩm
- Có event mới từ blockchain

**Xem kết quả:**
1. Vào trang Home: `http://localhost:3001/`
2. Quét QR code hoặc nhập Product ID
3. Scroll xuống xem phần "🔍 Phân Tích AI & Phát Hiện Bất Thường"

---

### 🎯 Cách 2: Trigger Thủ Công Qua Admin Dashboard

**Bước 1:** Đăng nhập Admin
- Vào: `http://localhost:3001/producer/login`
- Đăng nhập với tài khoản admin

**Bước 2:** Vào Tab "🔍 AI Analysis"
- Click tab "🔍 AI Analysis" ở header

**Bước 3:** Trigger Phân Tích
- Nhập Product ID vào ô input
- Click nút "Trigger AI Analysis"
- Đợi vài giây để phân tích hoàn thành

**Bước 4:** Xem Kết Quả
- Danh sách anomalies sẽ hiển thị ngay
- Có thể filter theo severity (High/Medium/Low)

---

### 📊 Cách 3: Xem Danh Sách Anomalies

**Trong Admin Dashboard:**
1. Vào tab "🔍 AI Analysis"
2. Xem danh sách tất cả sản phẩm có anomalies
3. Filter theo severity:
   - **High Risk**: Anomaly score > 70 (màu đỏ)
   - **Medium Risk**: Anomaly score 40-70 (màu vàng)
   - **Low Risk**: Anomaly score < 40 (màu xanh)

---

## 🧪 Test Nhanh

### Test Case 1: Sản Phẩm Bình Thường

1. Tạo sản phẩm với events hợp lệ:
   - Thời gian giữa events: 5-7 ngày
   - Status: Created → Approved → Shipped → Delivered
   - Địa điểm khác nhau

2. Trigger AI: Nhập Product ID → Click "Trigger AI Analysis"

3. **Kết quả mong đợi:**
   - ✅ Authenticity: "Verified"
   - ✅ Anomaly Score: < 40
   - ✅ Confidence: > 80%

### Test Case 2: Sản Phẩm Có Cảnh Báo

1. Tạo sản phẩm với events bất thường:
   - Thời gian giữa 2 events < 1 giờ
   - Địa điểm trùng lặp
   - Thời gian giữa events > 10 ngày

2. Trigger AI: Nhập Product ID → Click "Trigger AI Analysis"

3. **Kết quả mong đợi:**
   - ⚠️ Authenticity: "Warning"
   - ⚠️ Anomaly Score: 40-70
   - ⚠️ Confidence: 50-60%
   - ⚠️ Có 2-4 anomalies được phát hiện

---

## 📱 Xem Kết Quả Trên Trang Home

1. Mở trang Home: `http://localhost:3001/`
2. Nhập Product ID hoặc quét QR code
3. Click "Tìm kiếm sản phẩm"
4. Scroll xuống phần "🔍 Phân Tích AI & Phát Hiện Bất Thường"

**Bạn sẽ thấy:**
- Badge trạng thái (Verified/Warning/Suspicious)
- Anomaly Score với màu sắc tương ứng
- Danh sách các anomalies phát hiện được
- Chi tiết phân tích (Time/Status/Location)

---

## 🔧 Troubleshooting

**Vấn đề: Không thấy kết quả AI**
- ✅ Đảm bảo sản phẩm có ít nhất 2 events
- ✅ Trigger thủ công qua Admin Dashboard
- ✅ Kiểm tra console backend xem có lỗi không

**Vấn đề: Anomaly score luôn là 0**
- ✅ Kiểm tra sản phẩm có đủ events không
- ✅ Kiểm tra events có timestamp hợp lệ không

**Vấn đề: Không thể trigger AI**
- ✅ Đảm bảo đã đăng nhập với role admin
- ✅ Kiểm tra Product ID có tồn tại không

---

## 💡 Tips

1. **Để test nhanh:** Tạo sản phẩm với events có thời gian quá ngắn (< 1 giờ) sẽ trigger anomaly ngay
2. **Xem chi tiết:** Click vào từng anomaly card để xem đầy đủ thông tin
3. **Filter hiệu quả:** Dùng filter severity để tập trung vào các vấn đề nghiêm trọng




