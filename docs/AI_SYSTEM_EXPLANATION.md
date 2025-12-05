# 🤖 Giải Thích Hệ Thống AI - Cách Hoạt Động

## 📋 Tổng Quan

Hệ thống AI của TrueSource sử dụng **3 phương pháp kết hợp** để phát hiện anomalies trong chuỗi cung ứng:

1. **Isolation Forest (ML Model)** - Phương pháp chính, học từ dữ liệu
2. **OpenAI GPT** - Phân tích và giải thích thông minh (optional)
3. **Rule-based (Fallback)** - Logic if-else khi ML chưa sẵn sàng

---

## 🧠 1. Isolation Forest - Machine Learning Thực Sự

### Isolation Forest là gì?

**Isolation Forest** là một thuật toán **unsupervised learning** (học không giám sát) để phát hiện anomalies.

### Ý Tưởng Cốt Lõi:

> **"Các điểm bất thường dễ bị cô lập (isolate) hơn các điểm bình thường"**

Ví dụ:
- Điểm bình thường: Nhiều điểm tương tự nhau → Cần nhiều lần phân chia để isolate
- Điểm bất thường: Khác biệt với phần lớn → Chỉ cần vài lần phân chia để isolate

### Cách Hoạt Động:

#### Bước 1: Xây Dựng Isolation Trees

```
1. Tạo nhiều Isolation Trees (mặc định: 100 trees)
2. Mỗi tree:
   - Chọn ngẫu nhiên một feature (thuộc tính)
   - Chọn ngẫu nhiên một giá trị split giữa min và max
   - Phân chia dữ liệu thành 2 phần
   - Lặp lại cho đến khi isolate được một điểm hoặc đạt max height
```

**Ví dụ:**
```
Tree 1:
  Split theo "thời gian trung bình" < 5 giờ
    ├─ Left: [sản phẩm A, B, C] (thời gian < 5h)
    └─ Right: [sản phẩm D] (thời gian >= 5h)
      └─ Isolate sản phẩm D (anomaly!)

Tree 2:
  Split theo "số lượng status changes" < 3
    ├─ Left: [sản phẩm A, B] (ít changes)
    └─ Right: [sản phẩm C, D] (nhiều changes)
      └─ Split tiếp...
```

#### Bước 2: Tính Path Length

**Path Length** = Số lần phân chia cần thiết để isolate một điểm

- **Điểm bình thường**: Path length dài (cần nhiều lần phân chia)
- **Điểm bất thường**: Path length ngắn (dễ isolate)

#### Bước 3: Tính Anomaly Score

```
s(x, n) = 2^(-E(h(x))/c(n))

Trong đó:
- E(h(x)): Average path length qua tất cả trees
- c(n): Average path length cho n điểm bình thường
- Score càng gần 1 → Càng bất thường
- Score càng gần 0 → Càng bình thường
```

**Ví dụ:**
- Score = 0.1 → Bình thường (10% bất thường)
- Score = 0.5 → Cảnh báo (50% bất thường)
- Score = 0.9 → Rất bất thường (90% bất thường)

### Ưu Điểm:

✅ **Học từ dữ liệu**: Không cần gán nhãn (unsupervised)
✅ **Phát hiện pattern phức tạp**: Tự động học các pattern mà rule-based không thể
✅ **Thích nghi**: Có thể retrain với dữ liệu mới
✅ **Hiệu quả**: O(n log n) complexity

---

## 🔍 2. Feature Extraction - Trích Xuất Đặc Trưng

### Mục Đích:

Chuyển đổi dữ liệu events thành **feature vectors** (mảng số) để ML model có thể xử lý.

### 30 Features Được Trích Xuất:

#### A. Time-based Features (5 features)
```javascript
1. Mean hours: Thời gian trung bình giữa các events (giờ)
2. Min hours: Thời gian ngắn nhất (giờ)
3. Max hours: Thời gian dài nhất (giờ)
4. Ratio > 30 days: Tỷ lệ intervals > 30 ngày
5. Ratio < 0.1 days: Tỷ lệ intervals < 0.1 ngày
```

#### B. Status-based Features (10 features)
```javascript
1. Total status changes: Tổng số lần đổi status
2. Unique statuses: Số lượng status khác nhau
3. Invalid transitions: Số lần chuyển status không hợp lệ
4. Status regressions: Số lần status quay ngược
5. Mean status index: Chỉ số status trung bình
6. Max status: Status cao nhất
7. Min status: Status thấp nhất
8. Status range: Khoảng cách giữa max và min
9. Delivery count: Số lần "Delivered"
10. Creation count: Số lần "Created"
```

#### C. Location-based Features (5 features)
```javascript
1. Total locations: Tổng số địa điểm
2. Unique locations: Số lượng địa điểm khác nhau
3. Duplicate locations: Số lần địa điểm trùng lặp liên tiếp
4. Country changes: Số lần đổi quốc gia
5. Unique countries: Số lượng quốc gia khác nhau
```

#### D. Sequence-based Features (5 features)
```javascript
1. Total events: Tổng số events
2. Unique event types: Số loại event khác nhau
3. Rapid changes: Số lần thay đổi < 1 giờ
4. Same type consecutive: Số lần cùng loại liên tiếp
5. Rapid change ratio: Tỷ lệ rapid changes
```

#### E. Statistical Features (5 features)
```javascript
1. Mean interval: Thời gian trung bình
2. Standard deviation: Độ lệch chuẩn
3. Variance: Phương sai
4. Outliers > 2 std dev: Số outliers > 2 độ lệch chuẩn
5. Outliers < -2 std dev: Số outliers < -2 độ lệch chuẩn
```

**Ví dụ Feature Vector:**
```javascript
[5.2, 0.5, 10.3, 0.1, 0.2,  // Time features
 4, 3, 0, 0, 2.5, 6, 0, 6, 1, 1,  // Status features
 5, 4, 1, 2, 2,  // Location features
 5, 4, 1, 0, 0.2,  // Sequence features
 5.2, 3.1, 9.6, 1, 0]  // Statistical features
```

---

## 🎯 3. Quy Trình Phân Tích Hoàn Chỉnh

### Khi Một Sản Phẩm Được Phân Tích:

```
1. Extract Features
   └─> Chuyển events thành feature vector (30 số)

2. ML Prediction (nếu model đã train)
   └─> Isolation Forest dự đoán anomaly score (0-1)
   └─> Convert sang scale 0-100

3. Rule-based Analysis (luôn chạy)
   └─> Phân tích Time/Status/Location patterns
   └─> Tính score dựa trên rules

4. Combine Results
   └─> Nếu có ML: ML (70%) + Rule-based (30%)
   └─> Nếu không có ML: Chỉ Rule-based

5. OpenAI Analysis (optional, nếu có API key)
   └─> GPT phân tích và giải thích kết quả
   └─> Tạo summary tự nhiên

6. Final Result
   └─> Authenticity: Verified/Warning/Suspicious
   └─> Confidence: 0-100%
   └─> Anomaly Score: 0-100
   └─> Detailed anomalies list
```

---

## 📊 4. So Sánh: Rule-based vs ML

### Rule-based (Cũ):
```javascript
if (timeInterval < 3600) {
  anomalyScore += 20;
}
if (invalidStatusSequence) {
  anomalyScore += 25;
}
// ... nhiều if-else khác
```

**Nhược điểm:**
- ❌ Không học từ dữ liệu
- ❌ Không phát hiện được pattern phức tạp
- ❌ Cần cập nhật thủ công khi có pattern mới

### ML (Mới):
```javascript
// Model tự học từ 1000+ products
const features = extractFeatures(product);
const mlScore = isolationForest.predict(features);
// Model tự động phát hiện anomalies dựa trên pattern đã học
```

**Ưu điểm:**
- ✅ Học từ dữ liệu thực tế
- ✅ Phát hiện pattern phức tạp mà rule-based không thể
- ✅ Tự động thích nghi với dữ liệu mới

---

## 🔄 5. Training Process

### Khi Nào Model Được Train?

1. **Lần đầu khởi động**: Tự động train khi app start
2. **Retrain thủ công**: Admin có thể trigger qua API
3. **Retrain tự động**: Có thể setup cron job (chưa implement)

### Quy Trình Training:

```
1. Load Training Data
   └─> Lấy tất cả products có events từ MongoDB
   └─> Giới hạn 1000 products để không quá chậm

2. Extract Features
   └─> Chuyển mỗi product thành feature vector

3. Build Isolation Forest
   └─> Tạo 100 Isolation Trees
   └─> Mỗi tree dùng random sample (subsampling)

4. Model Ready
   └─> Model sẵn sàng để predict
```

### Yêu Cầu:

- **Tối thiểu**: 10 products có events
- **Khuyến nghị**: 100+ products để có độ chính xác tốt

---

## 🚀 6. Cách Sử Dụng

### A. Tự Động (Không Cần Làm Gì)

Model tự động train khi app khởi động và tự động phân tích khi product được update.

### B. Retrain Model Thủ Công

```bash
POST http://localhost:3000/admin/ai/retrain
Authorization: Bearer <admin_token>
```

### C. Trigger Phân Tích Cho Sản Phẩm

```bash
POST http://localhost:3000/admin/analyze-product/:id
Authorization: Bearer <admin_token>
```

---

## 🎨 7. Kết Quả Trả Về

```json
{
  "authenticity": "Warning",
  "confidence": 60,
  "anomalyScore": 40,
  "method": "hybrid_ml_rule",
  "mlScore": 0.35,
  "analysis": "Phân tích từ GPT hoặc rule-based...",
  "anomalies": [
    {
      "type": "time_too_fast",
      "severity": "high",
      "message": "Thời gian giữa Shipment và Warehouse quá ngắn..."
    }
  ],
  "details": {
    "mlModel": {
      "score": 35,
      "mlScore": 0.35,
      "features": 30
    },
    "timeAnalysis": {...},
    "statusAnalysis": {...},
    "locationAnalysis": {...}
  }
}
```

**Giải Thích:**
- `method`: Phương pháp sử dụng (`isolation_forest`, `hybrid_ml_rule`, `rule_based`)
- `mlScore`: Score từ ML model (0-1)
- `anomalyScore`: Final score (0-100)
- `confidence`: Độ tin cậy = 100 - anomalyScore

---

## 🔧 8. Cấu Hình

### Environment Variables:

```env
# OpenAI (optional)
OPENAI_API_KEY=sk-...

# ML Model Settings (trong code)
NUM_TREES=100        # Số lượng Isolation Trees
MAX_HEIGHT=10        # Chiều cao tối đa của tree
TRAINING_LIMIT=1000  # Số lượng products để train
```

---

## 📈 9. Performance

### Training Time:
- 100 products: ~1-2 giây
- 1000 products: ~5-10 giây

### Prediction Time:
- Mỗi prediction: ~10-50ms (rất nhanh!)

### Memory Usage:
- Model size: ~1-5MB (tùy số lượng trees)

---

## ✅ 10. Kết Luận

Hệ thống AI của TrueSource:

1. **Sử dụng ML thực sự** (Isolation Forest) - không chỉ if-else
2. **Học từ dữ liệu** - tự động phát hiện pattern
3. **Kết hợp nhiều phương pháp** - ML + Rule-based + OpenAI
4. **Hiệu quả và chính xác** - phát hiện anomalies tốt hơn rule-based thuần túy

**Đây là AI thực sự, không phải chỉ là rule-based system!** 🎉

