# Quick Start Guide - Test Contract & API

## 🚀 Cách Test Nhanh

### Bước 1: Test Contract (Không cần server)

```bash
cd backend
npm run test:contract
```

Script này sẽ:
- ✅ Test kết nối contract
- ✅ Test thêm products
- ✅ Test update status
- ✅ Test event listeners

**Lưu ý:** Cần có `.env` với:
- `CONTRACT_ADDRESS`
- `PRIVATE_KEY`
- `ALCHEMY_API_KEY` hoặc `ALCHEMY_RPC_URL`

---

### Bước 2: Test API (Cần server chạy)

**Terminal 1: Start Server**
```bash
cd backend
npm start
```

Đợi đến khi thấy:
```
Backend running on port 3000
MongoDB connected
✅ Ethers.js WebSocketProvider initialized
```

**Terminal 2: Run API Tests**
```bash
cd backend
npm run test:api
```

---

## 📋 Checklist Trước Khi Test

### Cho test:contract
- [ ] `.env` có `CONTRACT_ADDRESS`
- [ ] `.env` có `PRIVATE_KEY` (account có PRODUCER_ROLE)
- [ ] `.env` có `ALCHEMY_API_KEY` hoặc `ALCHEMY_RPC_URL`
- [ ] Account có Sepolia ETH (lấy tại https://sepoliafaucet.com/)

### Cho test:api
- [ ] Tất cả requirements của test:contract
- [ ] MongoDB đang chạy
- [ ] Server đang chạy (`npm start`)
- [ ] `.env` có `MONGODB_URI`
- [ ] `.env` có `JWT_SECRET`

---

## 🔧 Troubleshooting

### Lỗi: "Server is not running"
**Giải pháp:**
1. Mở terminal mới
2. `cd backend`
3. `npm start`
4. Đợi server khởi động xong
5. Chạy lại `npm run test:api`

### Lỗi: "MongoDB connection failed"
**Giải pháp:**
1. Kiểm tra MongoDB đang chạy: `mongod` hoặc service MongoDB
2. Kiểm tra `MONGODB_URI` trong `.env`
3. Thử kết nối: `mongosh` hoặc `mongo`

### Lỗi: "Contract not found"
**Giải pháp:**
1. Kiểm tra `CONTRACT_ADDRESS` trong `.env`
2. Đảm bảo contract đã được deploy lên Sepolia
3. Kiểm tra trên Etherscan: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

---

## 📊 Kết Quả Test

### test:contract thành công sẽ hiển thị:
```
✅ Contract connected successfully
✅ Products Added: 3
✅ Product Details: Retrieved
✅ Status Updates: Tested
✅ History Retrieval: Tested
✅ Event Listeners: Tested
```

### test:api thành công sẽ hiển thị:
```
✅ User Registration/Login: Tested
✅ Authentication: Working
✅ Add Product: Tested
✅ Get Product: Tested
✅ Get History: Tested
✅ Authorization: Working
```

