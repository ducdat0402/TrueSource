# 🚀 Hướng Dẫn Chia Sẻ và Deploy TrueSource qua Docker

## 📋 Mục Lục

1. [Cách 1: Chia Sẻ Source Code (Đơn Giản Nhất)](#cách-1-chia-sẻ-source-code)
2. [Cách 2: Export Docker Images](#cách-2-export-docker-images)
3. [Cách 3: Push Lên Docker Hub (Chuyên Nghiệp)](#cách-3-push-lên-docker-hub)
4. [Hướng Dẫn Cho Người Nhận](#hướng-dẫn-cho-người-nhận)

---

## 🎯 Cách 1: Chia Sẻ Source Code (Đơn Giản Nhất)

### Bước 1: Chuẩn Bị File Cần Thiết

Đảm bảo các file sau có trong dự án:
- ✅ `docker/docker-compose.yml`
- ✅ `backend/Dockerfile`
- ✅ `frontend/Dockerfile`
- ✅ `frontend/nginx.conf`
- ✅ `backend/.env.example`

### Bước 2: Tạo File Hướng Dẫn

Tạo file `SETUP_INSTRUCTIONS.md` với nội dung:

```markdown
# Hướng Dẫn Cài Đặt TrueSource

## Yêu Cầu
- Docker Desktop đã cài đặt
- Git đã cài đặt

## Các Bước

1. Clone repository:
   git clone <your-repo-url>
   cd TrueSource

2. Tạo file .env:
   cd backend
   cp .env.example .env
   # Chỉnh sửa các giá trị trong .env

3. Chạy Docker:
   docker-compose -f docker/docker-compose.yml up -d

4. Truy cập:
   - Frontend: http://localhost:3001
   - Backend: http://localhost:3000
```

### Bước 3: Chia Sẻ

**Option A: Qua Git Repository**
```bash
# Push lên GitHub/GitLab
git add .
git commit -m "Add Docker configuration"
git push origin main
```

**Option B: Nén và Gửi**
```bash
# Tạo file zip (loại trừ node_modules)
zip -r TrueSource.zip . -x "node_modules/*" "*/node_modules/*" ".git/*"
```

---

## 📦 Cách 2: Export Docker Images

### Bước 1: Build và Export Images

```bash
# Build tất cả images
docker-compose -f docker/docker-compose.yml build

# Export backend image
docker save docker-backend:latest -o truesource-backend.tar

# Export frontend image  
docker save docker-frontend:latest -o truesource-frontend.tar
```

### Bước 2: Tạo Package

Tạo thư mục `docker-package`:
```bash
mkdir docker-package
mv truesource-backend.tar docker-package/
mv truesource-frontend.tar docker-package/
cp docker/docker-compose.yml docker-package/
cp -r backend docker-package/  # Chỉ cần .env.example
cp -r frontend docker-package/  # Chỉ cần Dockerfile và nginx.conf
```

### Bước 3: Tạo Script Load Images

Tạo file `docker-package/load-images.sh`:
```bash
#!/bin/bash
echo "Loading Docker images..."
docker load -i truesource-backend.tar
docker load -i truesource-frontend.tar
echo "Images loaded successfully!"
```

### Bước 4: Nén và Chia Sẻ

```bash
cd docker-package
zip -r truesource-docker-package.zip .
```

**Gửi file `truesource-docker-package.zip` cho người khác**

---

## 🐳 Cách 3: Push Lên Docker Hub (Chuyên Nghiệp)

### Bước 1: Tạo Tài Khoản Docker Hub

1. Đăng ký tại: https://hub.docker.com
2. Tạo repository: `truesource-backend` và `truesource-frontend`

### Bước 2: Tag và Push Images

```bash
# Login vào Docker Hub
docker login

# Tag images
docker tag docker-backend:latest <your-username>/truesource-backend:latest
docker tag docker-frontend:latest <your-username>/truesource-frontend:latest

# Push lên Docker Hub
docker push <your-username>/truesource-backend:latest
docker push <your-username>/truesource-frontend:latest
```

### Bước 3: Cập Nhật docker-compose.yml

Tạo file `docker/docker-compose.prod.yml`:

```yaml
services:
  mongodb:
    image: mongo:7
    # ... (giữ nguyên)

  redis:
    image: redis:7-alpine
    # ... (giữ nguyên)

  rabbitmq:
    image: rabbitmq:3-management-alpine
    # ... (giữ nguyên)

  backend:
    image: <your-username>/truesource-backend:latest
    # Thay vì build, dùng image từ Docker Hub
    # build:
    #   context: ../backend
    #   dockerfile: Dockerfile
    # ... (giữ nguyên phần còn lại)

  frontend:
    image: <your-username>/truesource-frontend:latest
    # Thay vì build, dùng image từ Docker Hub
    # build:
    #   context: ../frontend
    #   dockerfile: Dockerfile
    # ... (giữ nguyên phần còn lại)
```

### Bước 4: Chia Sẻ

Chia sẻ:
- Link Docker Hub repositories
- File `docker-compose.prod.yml`
- File `.env.example`

---

## 👥 Hướng Dẫn Cho Người Nhận

### Nếu Nhận Source Code (Cách 1)

```bash
# 1. Clone hoặc giải nén
git clone <repo-url>
# hoặc
unzip TrueSource.zip

# 2. Cài đặt Docker Desktop
# Download từ: https://www.docker.com/products/docker-desktop

# 3. Tạo file .env
cd backend
cp .env.example .env
# Chỉnh sửa .env với các giá trị phù hợp

# 4. Chạy Docker
cd ..
docker-compose -f docker/docker-compose.yml up -d

# 5. Kiểm tra
docker-compose -f docker/docker-compose.yml ps
```

### Nếu Nhận Docker Images (Cách 2)

```bash
# 1. Giải nén package
unzip truesource-docker-package.zip
cd docker-package

# 2. Load images
chmod +x load-images.sh
./load-images.sh
# hoặc thủ công:
docker load -i truesource-backend.tar
docker load -i truesource-frontend.tar

# 3. Tạo file .env
cd backend
cp .env.example .env
# Chỉnh sửa .env

# 4. Chạy Docker Compose
cd ../docker
docker-compose up -d
```

### Nếu Dùng Docker Hub (Cách 3)

```bash
# 1. Pull images từ Docker Hub
docker pull <your-username>/truesource-backend:latest
docker pull <your-username>/truesource-frontend:latest

# 2. Tạo file .env
cd backend
cp .env.example .env
# Chỉnh sửa .env

# 3. Chạy với docker-compose.prod.yml
cd ../docker
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📝 Checklist Trước Khi Chia Sẻ

- [ ] Đảm bảo `.env` không được commit (đã có trong `.gitignore`)
- [ ] Tạo file `.env.example` với các biến môi trường cần thiết
- [ ] Test Docker trên máy khác trước khi chia sẻ
- [ ] Viết hướng dẫn rõ ràng
- [ ] Kiểm tra tất cả dependencies trong `docker-compose.yml`
- [ ] Đảm bảo không có hardcoded paths

---

## 🔒 Lưu Ý Bảo Mật

1. **KHÔNG** chia sẻ file `.env` với thông tin nhạy cảm
2. **KHÔNG** commit private keys, API keys vào Git
3. Sử dụng `.env.example` với giá trị mẫu
4. Hướng dẫn người nhận tạo `.env` riêng

---

## 🆘 Troubleshooting

### Lỗi: "Image not found"
- Đảm bảo đã load images hoặc pull từ Docker Hub
- Kiểm tra tên image trong docker-compose.yml

### Lỗi: "Port already in use"
- Dừng services đang dùng port đó
- Hoặc đổi port trong docker-compose.yml

### Lỗi: "Cannot connect to database"
- Kiểm tra MongoDB container đã chạy
- Kiểm tra MONGODB_URI trong .env

---

**Chúc bạn chia sẻ thành công! 🎉**






