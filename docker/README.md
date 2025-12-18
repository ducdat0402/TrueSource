# Hướng Dẫn Sử Dụng Docker cho TrueSource

## 📋 Mục Lục

1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Cài Đặt Docker](#cài-đặt-docker)
3. [Cấu Hình Môi Trường](#cấu-hình-môi-trường)
4. [Chạy Ứng Dụng](#chạy-ứng-dụng)
5. [Các Lệnh Thường Dùng](#các-lệnh-thường-dùng)
6. [Truy Cập Services](#truy-cập-services)
7. [Xử Lý Lỗi](#xử-lý-lỗi)
8. [Development Mode](#development-mode)

---

## 🖥️ Yêu Cầu Hệ Thống

- **Docker Desktop** (Windows/Mac) hoặc **Docker Engine + Docker Compose** (Linux)
- **RAM tối thiểu**: 4GB (khuyến nghị 8GB)
- **Dung lượng ổ cứng**: Ít nhất 5GB trống
- **Kết nối Internet**: Để tải Docker images

---

## 📦 Cài Đặt Docker

### Windows/Mac

1. Tải Docker Desktop từ: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop
3. Đợi đến khi icon Docker hiển thị "Docker Desktop is running"

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

### Kiểm Tra Cài Đặt

```bash
docker --version
docker-compose --version
```

---

## ⚙️ Cấu Hình Môi Trường

### Bước 1: Tạo file `.env` cho Backend

Sao chép file `.env.example` thành `.env`:

```bash
cd backend
cp .env.example .env
```

### Bước 2: Cập Nhật Các Giá Trị Trong `.env`

Mở file `backend/.env` và cập nhật các giá trị sau:

```env
# MongoDB - Đã được cấu hình tự động trong docker-compose.yml
MONGODB_URI=mongodb://admin:password@mongodb:27017/truesource?authSource=admin

# Redis - Đã được cấu hình tự động
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ - Đã được cấu hình tự động
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672

# JWT Secret - QUAN TRỌNG: Thay đổi giá trị này!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Blockchain - Cần cấu hình
ALCHEMY_API_KEY=your-alchemy-api-key-here
CONTRACT_ADDRESS=your-contract-address-here
PRIVATE_KEY=your-private-key-here

# OpenAI (Optional)
OPENAI_API_KEY=your-openai-api-key-here

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Node Environment
NODE_ENV=production
```

**Lưu ý quan trọng:**
- `JWT_SECRET`: Tạo một chuỗi ngẫu nhiên mạnh (ví dụ: dùng `openssl rand -base64 32`)
- `ALCHEMY_API_KEY`: Lấy từ https://www.alchemy.com/
- `CONTRACT_ADDRESS`: Địa chỉ smart contract đã deploy
- `PRIVATE_KEY`: Private key của account có quyền trong contract (KHÔNG commit vào Git!)

---

## 🚀 Chạy Ứng Dụng

### Lần Đầu Chạy

Từ thư mục gốc dự án:

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Hoặc vào thư mục `docker`:

```bash
cd docker
docker-compose up -d
```

Lần đầu sẽ mất 5-10 phút để:
- Tải các Docker images (MongoDB, Redis, RabbitMQ, Node.js, Nginx)
- Build images cho backend và frontend
- Khởi động tất cả services

### Kiểm Tra Trạng Thái

```bash
docker-compose -f docker/docker-compose.yml ps
```

Bạn sẽ thấy 5 containers đang chạy:
- ✅ `truesource-mongodb`
- ✅ `truesource-redis`
- ✅ `truesource-rabbitmq`
- ✅ `truesource-backend`
- ✅ `truesource-frontend`

### Xem Logs

```bash
# Xem tất cả logs
docker-compose -f docker/docker-compose.yml logs -f

# Xem logs của một service cụ thể
docker-compose -f docker/docker-compose.yml logs -f backend
docker-compose -f docker/docker-compose.yml logs -f frontend
```

---

## 🌐 Truy Cập Services

Sau khi containers chạy thành công:

| Service | URL | Thông Tin Đăng Nhập |
|---------|-----|---------------------|
| **Frontend** | http://localhost:3001 | - |
| **Backend API** | http://localhost:3000 | - |
| **RabbitMQ Management** | http://localhost:15672 | Username: `admin`<br>Password: `password` |
| **MongoDB** | localhost:27017 | Username: `admin`<br>Password: `password` |
| **Redis** | localhost:6379 | - |

---

## 🔧 Các Lệnh Thường Dùng

### Dừng Services

```bash
docker-compose -f docker/docker-compose.yml stop
```

### Khởi Động Lại Services

```bash
docker-compose -f docker/docker-compose.yml start
```

### Dừng và Xóa Containers

```bash
docker-compose -f docker/docker-compose.yml down
```

### Dừng và Xóa Tất Cả (Bao Gồm Dữ Liệu)

⚠️ **CẢNH BÁO**: Lệnh này sẽ xóa tất cả dữ liệu trong databases!

```bash
docker-compose -f docker/docker-compose.yml down -v
```

### Rebuild Images (Khi Code Thay Đổi)

```bash
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

### Restart Một Service Cụ Thể

```bash
docker-compose -f docker/docker-compose.yml restart backend
docker-compose -f docker/docker-compose.yml restart frontend
```

### Vào Trong Container (Debug)

```bash
# Vào container backend
docker exec -it truesource-backend sh

# Vào container frontend
docker exec -it truesource-frontend sh

# Vào MongoDB shell
docker exec -it truesource-mongodb mongosh -u admin -p password

# Vào Redis CLI
docker exec -it truesource-redis redis-cli
```

### Xem Dung Lượng Đã Sử Dụng

```bash
docker system df
```

### Dọn Dẹp (Xóa Images/Containers Không Dùng)

```bash
docker system prune -a
```

---

## 🐛 Xử Lý Lỗi

### Lỗi: Port Đã Được Sử Dụng

**Triệu chứng:**
```
Error: bind: address already in use
```

**Giải pháp:**

1. Kiểm tra port nào đang được dùng:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   
   # Linux/Mac
   lsof -i :3000
   lsof -i :3001
   ```

2. Đổi port trong `docker-compose.yml` hoặc dừng service đang dùng port đó

### Lỗi: Container Không Khởi Động Được

**Triệu chứng:**
```
Container truesource-backend exited with code 1
```

**Giải pháp:**

1. Xem logs chi tiết:
   ```bash
   docker-compose -f docker/docker-compose.yml logs backend
   ```

2. Kiểm tra file `.env` có đầy đủ biến môi trường không

3. Kiểm tra container status:
   ```bash
   docker ps -a
   ```

### Lỗi: Kết Nối Database Thất Bại

**Triệu chứng:**
```
MongoServerError: Authentication failed
```

**Giải pháp:**

1. Đảm bảo MongoDB container đã khởi động xong:
   ```bash
   docker-compose -f docker/docker-compose.yml ps mongodb
   ```

2. Kiểm tra `MONGODB_URI` trong `.env` đúng format:
   ```
   mongodb://admin:password@mongodb:27017/truesource?authSource=admin
   ```

3. Đợi vài giây sau khi start để services sẵn sàng

### Lỗi: Build Failed

**Triệu chứng:**
```
ERROR: failed to solve: process "/bin/sh -c npm ci" did not complete successfully
```

**Giải pháp:**

1. Xóa cache và rebuild:
   ```bash
   docker-compose -f docker/docker-compose.yml down
   docker-compose -f docker/docker-compose.yml build --no-cache
   docker-compose -f docker/docker-compose.yml up -d
   ```

2. Kiểm tra file `package.json` có lỗi không

### Lỗi: Frontend Không Kết Nối Được Backend

**Triệu chứng:**
```
Network Error khi gọi API
```

**Giải pháp:**

1. Kiểm tra `REACT_APP_API_URL` trong `docker-compose.yml`:
   ```yaml
   environment:
     REACT_APP_API_URL: http://localhost:3000
   ```

2. Kiểm tra backend đang chạy:
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## 💻 Development Mode

Nếu muốn chạy ở chế độ development với hot reload, bạn có thể:

1. Chạy chỉ các services cần thiết (MongoDB, Redis, RabbitMQ):
   ```bash
   docker-compose -f docker/docker-compose.yml up -d mongodb redis rabbitmq
   ```

2. Chạy backend và frontend local:
   ```bash
   # Terminal 1: Backend
   cd backend
   npm install
   npm start
   
   # Terminal 2: Frontend
   cd frontend
   npm install
   npm start
   ```

---

## 📊 Kiểm Tra Hoạt Động

### Test Backend API

```bash
curl http://localhost:3000/api/health
```

### Test Frontend

Mở trình duyệt: http://localhost:3001

### Test MongoDB

```bash
docker exec -it truesource-mongodb mongosh -u admin -p password
```

Trong MongoDB shell:
```javascript
use truesource
show collections
```

### Test Redis

```bash
docker exec -it truesource-redis redis-cli
```

Trong Redis CLI:
```bash
PING
# Kết quả: PONG
```

### Test RabbitMQ

Truy cập: http://localhost:15672
- Username: `admin`
- Password: `password`

---

## 🔄 Quy Trình Làm Việc Hàng Ngày

### Khi Bắt Đầu Làm Việc

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### Khi Kết Thúc Làm Việc

```bash
docker-compose -f docker/docker-compose.yml stop
```

### Khi Code Thay Đổi

```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

---

## 📝 Ghi Chú Quan Trọng

1. **Không commit file `.env`** vào Git (đã có trong `.gitignore`)
2. **Backup dữ liệu** trước khi chạy `docker-compose down -v`
3. **Thay đổi mật khẩu mặc định** trong production
4. **Giữ bí mật private key** - không chia sẻ hoặc commit vào Git
5. **Kiểm tra logs** thường xuyên để phát hiện lỗi sớm

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs: `docker-compose logs -f`
2. Kiểm tra status: `docker-compose ps`
3. Xem file hướng dẫn này
4. Kiểm tra file `.env` có đầy đủ không

---

**Chúc bạn sử dụng Docker thành công! 🐳**







