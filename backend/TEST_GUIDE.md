# Hướng Dẫn Test Contract trên Testnet

## 📋 Yêu Cầu Trước Khi Test

### 1. Cấu hình `.env`
Đảm bảo file `.env` có các biến sau:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/truesource

# Blockchain (Sepolia Testnet)
ALCHEMY_API_KEY=your_alchemy_api_key
# Hoặc
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
ALCHEMY_WS_URL=wss://eth-sepolia.g.alchemy.com/v2/your_api_key

# Contract
CONTRACT_ADDRESS=0x... (địa chỉ contract đã deploy)

# Private Key (không có 0x ở đầu)
PRIVATE_KEY=your_private_key

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

### 2. Contract đã được deploy
- Contract phải được deploy lên Sepolia testnet
- Có địa chỉ contract address
- Account có PRODUCER_ROLE (thường là deployer account)

### 3. Account có Sepolia ETH
- Cần Sepolia ETH để trả gas fees
- Lấy free Sepolia ETH tại: https://sepoliafaucet.com/

---

## 🧪 Các Cách Test

### Cách 1: Test Contract Trực Tiếp (Không qua API)

Test tất cả các functions của contract:

```bash
npm run test:contract
```

**Script này sẽ test:**
1. ✅ Kết nối contract
2. ✅ Kiểm tra roles
3. ✅ Thêm products (3 products mẫu)
4. ✅ Lấy thông tin product
5. ✅ Cập nhật status
6. ✅ Lấy history
7. ✅ Test event listeners (Ethers.js)

**Dữ liệu test mẫu:**
- 3 products với origin và QR hash khác nhau
- Status updates với event types: Shipment, Customs, Delivery

---

### Cách 2: Test API Endpoints

Test các API endpoints của backend:

**Bước 1: Start server**
```bash
npm start
```

**Bước 2: Chạy test API (terminal khác)**
```bash
npm run test:api
```

**Script này sẽ test:**
1. ✅ Register/Login user
2. ✅ Get current user (auth required)
3. ✅ Add product (protected route, cần PRODUCER role)
4. ✅ Get product from MongoDB
5. ✅ Get history from contract
6. ✅ Test unauthorized access
7. ✅ Test authorization

---

## 📊 Dữ Liệu Test Mẫu

### Products Test Data

```javascript
{
  products: [
    {
      origin: 'Vietnam - Ho Chi Minh City',
      qrHash: 'QH001-VN-HCM-2024-ABC123'
    },
    {
      origin: 'Thailand - Bangkok',
      qrHash: 'QH002-TH-BKK-2024-XYZ789'
    },
    {
      origin: 'Malaysia - Kuala Lumpur',
      qrHash: 'QH003-MY-KL-2024-DEF456'
    }
  ]
}
```

### Status Updates Test Data

```javascript
{
  statusUpdates: [
    {
      newStatus: 'In Transit',
      eventType: 'Shipment',
      location: 'Warehouse A - Ho Chi Minh City',
      details: 'Product shipped from origin warehouse'
    },
    {
      newStatus: 'In Transit',
      eventType: 'Customs',
      location: 'Customs Office - Border',
      details: 'Product cleared customs'
    },
    {
      newStatus: 'Delivered',
      eventType: 'Delivery',
      location: 'Final Destination - Customer Address',
      details: 'Product delivered to customer'
    }
  ]
}
```

---

## 🔍 Test Thủ Công (Manual Testing)

### 1. Test Contract Functions

#### Add Product
```bash
# Sử dụng Hardhat console hoặc Remix
contract.addProduct("Vietnam", "QR123")
```

#### Update Status
```bash
contract.updateStatus(
  1,  // product ID
  "In Transit",  // new status
  "Shipment",  // event type
  "Warehouse A",  // location
  "Shipped"  // details
)
```

#### Get History
```bash
contract.getHistory(1)  // product ID
```

### 2. Test API với cURL

#### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "producer1",
    "email": "producer1@example.com",
    "password": "password123",
    "role": "producer"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "producer1@example.com",
    "password": "password123"
  }'
```

#### Add Product (cần token)
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "origin": "Vietnam",
    "qrHash": "QR123"
  }'
```

#### Get Product
```bash
curl http://localhost:3000/products/1
```

#### Get History
```bash
curl http://localhost:3000/history/1
```

---

## ✅ Checklist Test

### Contract Functions
- [ ] Contract connection works
- [ ] User has PRODUCER_ROLE
- [ ] Can add products
- [ ] Can get product details
- [ ] Can update product status
- [ ] Can get product history
- [ ] Events are emitted correctly

### Event Listeners
- [ ] ProductCreated event is received
- [ ] ProductUpdated event is received
- [ ] Events sync to MongoDB
- [ ] AI analysis is triggered on ProductUpdated

### API Endpoints
- [ ] Register user works
- [ ] Login works
- [ ] Get current user (auth required)
- [ ] Add product (auth + role required)
- [ ] Get product from MongoDB
- [ ] Get history from contract
- [ ] Unauthorized access is blocked
- [ ] Wrong role is blocked

### Integration
- [ ] Product added via API → saved to MongoDB
- [ ] Product added via API → event received
- [ ] Status updated → MongoDB updated
- [ ] Status updated → AI analysis triggered

---

## 🐛 Troubleshooting

### Lỗi: "Cannot setup event listeners"
- **Nguyên nhân**: Không có WebSocket URL hoặc contract chưa được khởi tạo
- **Giải pháp**: Kiểm tra `ALCHEMY_WS_URL` hoặc `ALCHEMY_API_KEY` trong `.env`

### Lỗi: "Access denied" khi add product
- **Nguyên nhân**: User không có PRODUCER_ROLE
- **Giải pháp**: Đảm bảo account trong `.env` có PRODUCER_ROLE trong contract

### Lỗi: "Insufficient funds"
- **Nguyên nhân**: Account không có đủ Sepolia ETH
- **Giải pháp**: Lấy Sepolia ETH từ faucet: https://sepoliafaucet.com/

### Lỗi: "Contract not found"
- **Nguyên nhân**: CONTRACT_ADDRESS sai hoặc contract chưa được deploy
- **Giải pháp**: Kiểm tra contract address và đảm bảo contract đã được deploy

### Events không được nhận
- **Nguyên nhân**: WebSocket connection không hoạt động
- **Giải pháp**: 
  1. Kiểm tra WebSocket URL
  2. Kiểm tra server đang chạy
  3. Xem logs để debug

---

## 📝 Test Results Template

Sau khi test, ghi lại kết quả:

```
Test Date: [Date]
Network: Sepolia Testnet
Contract Address: [Address]

Contract Tests:
✅ Connection: Pass
✅ Add Product: Pass
✅ Get Product: Pass
✅ Update Status: Pass
✅ Get History: Pass
✅ Events: Pass/Fail

API Tests:
✅ Register: Pass
✅ Login: Pass
✅ Add Product: Pass
✅ Get Product: Pass
✅ Authorization: Pass

Issues Found:
- [List any issues]
```

---

## 🚀 Next Steps

Sau khi test thành công:
1. Deploy lên mainnet (nếu cần)
2. Update contract address trong production `.env`
3. Monitor events và logs
4. Setup monitoring và alerts

