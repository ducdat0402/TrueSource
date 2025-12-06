# 🚀 Hướng Dẫn Cài Đặt TrueSource

## ✅ Yêu Cầu Hệ Thống

- **Docker Desktop** đã cài đặt và đang chạy
  - Windows/Mac: https://www.docker.com/products/docker-desktop
  - Linux: `sudo apt-get install docker.io docker-compose`

## 📥 Cài Đặt

### Bước 1: Lấy Source Code

**Nếu nhận qua Git:**
```bash
git clone <repository-url>
cd TrueSource
```

**Nếu nhận file ZIP:**
```bash
unzip TrueSource.zip
cd TrueSource
```

### Bước 2: Tạo File Cấu Hình

```bash
cd backend
cp .env.example .env
```

Mở file `backend/.env` và cập nhật các giá trị:

```env
# MongoDB - Đã tự động cấu hình
MONGODB_URI=mongodb://admin:password@mongodb:27017/truesource?authSource=admin

# Redis - Đã tự động cấu hình
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ - Đã tự động cấu hình
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672

# JWT Secret - QUAN TRỌNG: Tạo chuỗi ngẫu nhiên
JWT_SECRET=your-super-secret-jwt-key-here

# Blockchain Configuration
ALCHEMY_API_KEY=your-alchemy-api-key
CONTRACT_ADDRESS=your-contract-address
PRIVATE_KEY=your-private-key

# OpenAI (Optional)
OPENAI_API_KEY=your-openai-api-key

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Node Environment
NODE_ENV=production
```

**Lưu ý:** Thay các giá trị `your-*` bằng giá trị thực tế của bạn.

### Bước 3: Chạy Docker

Từ thư mục gốc dự án:

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Lần đầu sẽ mất 5-10 phút để tải images và build.

### Bước 4: Kiểm Tra

```bash
# Xem trạng thái containers
docker-compose -f docker/docker-compose.yml ps

# Xem logs
docker-compose -f docker/docker-compose.yml logs -f
```

## 🌐 Truy Cập Ứng Dụng

Sau khi containers chạy thành công:

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `password`

## 🔧 Các Lệnh Thường Dùng

```bash
# Dừng services
docker-compose -f docker/docker-compose.yml stop

# Khởi động lại
docker-compose -f docker/docker-compose.yml start

# Dừng và xóa containers
docker-compose -f docker/docker-compose.yml down

# Xem logs
docker-compose -f docker/docker-compose.yml logs -f backend
```

## 🐛 Xử Lý Lỗi

### Lỗi: Port đã được sử dụng
- Dừng service đang dùng port đó
- Hoặc đổi port trong `docker-compose.yml`

### Lỗi: Container không khởi động
- Kiểm tra file `.env` có đầy đủ không
- Xem logs: `docker-compose logs backend`

### Lỗi: Kết nối database thất bại
- Đợi vài giây để MongoDB khởi động xong
- Kiểm tra MongoDB container: `docker ps`

## 📖 Tài Liệu Chi Tiết

Xem file [`docker/README.md`](docker/README.md) để biết thêm chi tiết.

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs: `docker-compose logs -f`
2. Kiểm tra file `.env` có đầy đủ không
3. Đảm bảo Docker Desktop đang chạy

