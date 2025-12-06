# 📦 Hướng Dẫn Chia Sẻ TrueSource qua Docker

## 🎯 Tổng Quan

Có 3 cách để chia sẻ phần mềm TrueSource cho người khác chạy qua Docker:

1. **Chia sẻ Source Code** (Đơn giản nhất) - Người nhận tự build
2. **Export Docker Images** (Nhanh) - Chia sẻ images đã build sẵn
3. **Push lên Docker Hub** (Chuyên nghiệp) - Public/Private repository

---

## 🚀 Cách 1: Chia Sẻ Source Code (Khuyến Nghị)

### Ưu Điểm:
- ✅ Đơn giản nhất
- ✅ Người nhận có thể xem và chỉnh sửa code
- ✅ Dễ cập nhật (chỉ cần git pull)

### Các Bước:

1. **Đảm bảo có các file cần thiết:**
   - ✅ `docker/docker-compose.yml`
   - ✅ `backend/Dockerfile`
   - ✅ `frontend/Dockerfile`
   - ✅ `frontend/nginx.conf`
   - ✅ `backend/.env.example`

2. **Push lên Git Repository:**
   ```bash
   git add .
   git commit -m "Add Docker configuration"
   git push origin main
   ```

3. **Chia sẻ link repository** + file `SETUP_INSTRUCTIONS.md`

### Người Nhận Sẽ Làm:
```bash
git clone <repo-url>
cd TrueSource
cd backend && cp .env.example .env  # Chỉnh sửa .env
cd ..
docker-compose -f docker/docker-compose.yml up -d
```

---

## 📦 Cách 2: Export Docker Images

### Khi Nào Dùng:
- Khi không muốn chia sẻ source code
- Khi muốn người nhận chạy nhanh không cần build

### Các Bước:

1. **Chạy script export:**
   ```bash
   ./scripts/export-docker-images.sh
   ```

2. **Tạo file ZIP:**
   ```bash
   cd docker-package
   zip -r ../truesource-docker-package.zip .
   ```

3. **Chia sẻ file ZIP** + hướng dẫn

### Người Nhận Sẽ Làm:
```bash
unzip truesource-docker-package.zip
cd docker-package
./load-images.sh
# Tạo .env và chạy docker-compose
```

---

## 🐳 Cách 3: Push Lên Docker Hub

### Khi Nào Dùng:
- Khi muốn chia sẻ chuyên nghiệp
- Khi có nhiều người cần dùng
- Khi muốn version control cho images

### Các Bước:

1. **Đăng ký Docker Hub:** https://hub.docker.com

2. **Login:**
   ```bash
   docker login
   ```

3. **Tag và Push:**
   ```bash
   # Tag images
   docker tag docker-backend:latest <username>/truesource-backend:latest
   docker tag docker-frontend:latest <username>/truesource-frontend:latest
   
   # Push
   docker push <username>/truesource-backend:latest
   docker push <username>/truesource-frontend:latest
   ```

4. **Tạo docker-compose.prod.yml** (xem file mẫu bên dưới)

5. **Chia sẻ:**
   - Link Docker Hub repositories
   - File `docker-compose.prod.yml`
   - File `.env.example`

---

## 📝 File docker-compose.prod.yml (Cho Docker Hub)

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: truesource-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    networks:
      - truesource-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: truesource-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - truesource-network
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: truesource-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - truesource-network
    restart: unless-stopped

  backend:
    image: <your-username>/truesource-backend:latest  # Thay bằng username của bạn
    container_name: truesource-backend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password@mongodb:27017/truesource?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
      RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
      FRONTEND_URL: http://localhost:3001
      PORT: 3000
    env_file:
      - ../backend/.env
    depends_on:
      - mongodb
      - redis
      - rabbitmq
    networks:
      - truesource-network
    restart: unless-stopped

  frontend:
    image: <your-username>/truesource-frontend:latest  # Thay bằng username của bạn
    container_name: truesource-frontend
    ports:
      - "3001:80"
    environment:
      REACT_APP_API_URL: http://localhost:3000
    depends_on:
      - backend
    networks:
      - truesource-network
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
  rabbitmq_data:

networks:
  truesource-network:
    driver: bridge
```

---

## ✅ Checklist Trước Khi Chia Sẻ

- [ ] File `.env` không được commit (đã có trong `.gitignore`)
- [ ] File `.env.example` đã được tạo với đầy đủ biến môi trường
- [ ] Đã test Docker trên máy khác
- [ ] File `SETUP_INSTRUCTIONS.md` đã được tạo
- [ ] Không có hardcoded paths trong code
- [ ] Tất cả dependencies đã được khai báo trong `docker-compose.yml`

---

## 🔒 Lưu Ý Bảo Mật

1. **KHÔNG** chia sẻ file `.env` với thông tin nhạy cảm
2. **KHÔNG** commit private keys, API keys vào Git
3. Sử dụng `.env.example` với giá trị mẫu
4. Hướng dẫn người nhận tạo `.env` riêng

---

## 📚 Tài Liệu Tham Khảo

- [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) - Hướng dẫn chi tiết
- [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Hướng dẫn cho người nhận
- [docker/README.md](docker/README.md) - Hướng dẫn sử dụng Docker

---

**Chúc bạn chia sẻ thành công! 🎉**

