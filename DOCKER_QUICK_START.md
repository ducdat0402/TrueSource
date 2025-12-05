# 🐳 Docker Quick Start Guide - TrueSource

## ⚡ Chạy Nhanh (5 Phút)

### Bước 1: Cài Docker Desktop
- Windows/Mac: https://www.docker.com/products/docker-desktop
- Khởi động Docker Desktop

### Bước 2: Cấu Hình Environment
```bash
cd backend
cp .env.example .env
```

Mở file `backend/.env` và cập nhật:
- `JWT_SECRET`: Tạo chuỗi ngẫu nhiên (ví dụ: `openssl rand -base64 32`)
- `ALCHEMY_API_KEY`: Lấy từ https://www.alchemy.com/
- `CONTRACT_ADDRESS`: Địa chỉ smart contract
- `PRIVATE_KEY`: Private key của account

### Bước 3: Chạy Docker
```bash
# Từ thư mục gốc dự án
docker-compose -f docker/docker-compose.yml up -d
```

### Bước 4: Kiểm Tra
- ✅ Frontend: http://localhost:3001
- ✅ Backend: http://localhost:3000
- ✅ RabbitMQ: http://localhost:15672 (admin/password)

## 📋 Các Lệnh Cơ Bản

```bash
# Xem logs
docker-compose -f docker/docker-compose.yml logs -f

# Dừng
docker-compose -f docker/docker-compose.yml stop

# Khởi động lại
docker-compose -f docker/docker-compose.yml start

# Dừng và xóa
docker-compose -f docker/docker-compose.yml down

# Rebuild khi code thay đổi
docker-compose -f docker/docker-compose.yml up -d --build
```

## 📖 Xem Hướng Dẫn Chi Tiết

Xem file [`docker/README.md`](docker/README.md) để biết thêm chi tiết.


