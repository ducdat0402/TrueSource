# Cấu Hình Port Frontend

Frontend được cấu hình để chạy trên cổng **3001** (backend chạy trên cổng 3000).

## Cách Chạy

### Cách 1: Sử dụng npm scripts (đã cấu hình sẵn)
```bash
npm start
# hoặc
npm run dev
```

### Cách 2: Tạo file .env (nếu cần override)
Tạo file `.env` trong thư mục `frontend/` với nội dung:
```
PORT=3001
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Kiểm Tra

Sau khi chạy `npm start`, frontend sẽ chạy tại:
- **http://localhost:3001**

Backend API và Socket.io vẫn chạy tại:
- **http://localhost:3000**


