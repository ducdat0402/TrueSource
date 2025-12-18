# Backend Tests

## Setup

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` với các biến môi trường cần thiết (xem `.env.example`)

3. Đảm bảo MongoDB đang chạy (hoặc sử dụng test database)

## Chạy Tests

```bash
# Chạy tất cả tests
npm test

# Chạy với coverage
npm test -- --coverage

# Chạy một file test cụ thể
npm test -- auth.test.js
```

## Test Files

- `auth.test.js`: Tests cho authentication (register, login)
- `products.test.js`: Tests cho product routes (tạo, lấy product, authorization)
- `eventListeners.test.js`: Integration tests cho event listeners (sync blockchain → MongoDB)

## Lưu ý

- Tests sử dụng test database riêng (có thể cấu hình trong `.env`)
- Web3 contract calls được mock trong một số tests
- Đảm bảo MongoDB đang chạy trước khi chạy tests

