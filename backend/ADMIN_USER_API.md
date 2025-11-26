# Admin & User API Documentation

## 🔐 Admin API (Admin Role Required)

Base URL: `http://localhost:3000/admin`

Tất cả routes đều cần:
- Header: `Authorization: Bearer <admin_token>`
- Role: `admin`

---

### User Management

#### 1. List Users
```
GET /admin/users?page=1&limit=10&search=username&role=producer
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by username or email
- `role` (optional): Filter by role (producer, consumer, admin)

**Response:**
```json
{
  "success": true,
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### 2. Grant Role
```
POST /admin/users/:userId/grant-role
Body: { "role": "producer" }
```

#### 3. Revoke Role
```
POST /admin/users/:userId/revoke-role
Body: { "role": "producer" }
```

---

### Product Management

#### 4. List Products
```
GET /admin/products?page=1&limit=10&status=Created&search=origin
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status
- `search`: Search by origin or QR hash

#### 5. Approve Product
```
POST /admin/products/:id/approve
Body: {
  "newStatus": "Approved",
  "eventType": "AdminApproval",
  "location": "Admin Office",
  "details": "Product approved by admin"
}
```

#### 6. Soft Delete Product
```
POST /admin/products/:id/soft-delete
```
Marks product as inactive in MongoDB (không xóa on-chain)

#### 7. Bulk Update Products
```
POST /admin/products/bulk-update
Body: {
  "productIds": [1, 2, 3],
  "updateData": {
    "currentStatus": "Approved"
  }
}
```

#### 8. Export Products to CSV
```
GET /admin/products/export
```
Returns CSV file download

---

### AI Management

#### 9. Trigger AI Analysis (Manual)
```
POST /admin/analyze-product/:id
```
Manually trigger AI analysis for a product

#### 10. Get AI Results
```
GET /admin/ai-results?page=1&limit=10
```
View all AI analysis results with risk levels

---

### System Monitoring

#### 11. Get System Logs
```
GET /admin/logs?page=1&limit=50&type=product_created&startDate=2024-01-01&endDate=2024-12-31&userId=...
```

**Query Parameters:**
- `type`: Filter by log type
- `startDate`, `endDate`: Date range
- `userId`: Filter by user

#### 12. Get Analytics
```
GET /admin/analytics
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "products": {
      "total": 100,
      "byStatus": [...],
      "recent": 10,
      "withAI": 50
    },
    "users": {
      "total": 25,
      "byRole": [...],
      "recent": 5
    },
    "transactions": {
      "total": 500
    }
  }
}
```

---

## 👤 User API

Base URL: `http://localhost:3000/user`

---

### Public Routes (No Auth Required)

#### 1. Trace Product
```
GET /user/trace/:id
```
Trace product by ID or QR hash. Works without authentication (guest mode).

**Response:**
```json
{
  "success": true,
  "product": {...},
  "history": {...},
  "source": "mongodb" // or "contract"
}
```

#### 2. Search Products
```
GET /user/search?q=Vietnam&page=1&limit=10
```

#### 3. Get AI Insights
```
GET /user/products/:id/ai-insights
```
Get AI analysis results for a product (public)

---

### Protected Routes (Auth Required)

#### 4. Get Dashboard
```
GET /user/dashboard
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "user": {...},
    "products": [...],
    "traceHistory": [...],
    "stats": {
      "totalTraces": 10,
      "totalProducts": 5
    }
  }
}
```

#### 5. Get My Products (Producer Only)
```
GET /user/products?page=1&limit=10
Headers: Authorization: Bearer <producer_token>
```

#### 6. Update Product Status (Producer Only)
```
POST /user/products/:id/update-status
Headers: Authorization: Bearer <producer_token>
Body: {
  "newStatus": "In Transit",
  "eventType": "Shipment",
  "location": "Warehouse A",
  "details": "Product shipped"
}
```

---

## 📊 Test Data for Postman

### Admin Test User
```json
POST /auth/register
{
  "username": "admin1",
  "email": "admin1@example.com",
  "password": "admin123",
  "role": "admin"
}
```

### Test Admin Endpoints

**List Users:**
```
GET /admin/users?page=1&limit=10
Headers: Authorization: Bearer <admin_token>
```

**Grant Producer Role:**
```
POST /admin/users/:userId/grant-role
Headers: Authorization: Bearer <admin_token>
Body: { "role": "producer" }
```

**Approve Product:**
```
POST /admin/products/1/approve
Headers: Authorization: Bearer <admin_token>
Body: {
  "newStatus": "Approved",
  "eventType": "AdminApproval",
  "location": "Admin Office",
  "details": "Approved by admin"
}
```

**Trigger AI Analysis:**
```
POST /admin/analyze-product/1
Headers: Authorization: Bearer <admin_token>
```

**Get Analytics:**
```
GET /admin/analytics
Headers: Authorization: Bearer <admin_token>
```

---

### Test User Endpoints

**Trace Product (Public):**
```
GET /user/trace/1
```

**Search Products (Public):**
```
GET /user/search?q=Vietnam
```

**Get Dashboard (Auth Required):**
```
GET /user/dashboard
Headers: Authorization: Bearer <token>
```

**Update Status (Producer Only):**
```
POST /user/products/1/update-status
Headers: Authorization: Bearer <producer_token>
Body: {
  "newStatus": "In Transit",
  "eventType": "Shipment",
  "location": "Warehouse A",
  "details": "Shipped"
}
```

---

## 🔒 Authorization Matrix

| Endpoint | Public | Consumer | Producer | Admin |
|---|---|---|---|---|
| GET /user/trace/:id | ✅ | ✅ | ✅ | ✅ |
| GET /user/search | ✅ | ✅ | ✅ | ✅ |
| GET /user/products/:id/ai-insights | ✅ | ✅ | ✅ | ✅ |
| GET /user/dashboard | ❌ | ✅ | ✅ | ✅ |
| GET /user/products | ❌ | ❌ | ✅ | ✅ |
| POST /user/products/:id/update-status | ❌ | ❌ | ✅ | ✅ |
| GET /admin/* | ❌ | ❌ | ❌ | ✅ |

---

## 📝 Notes

1. **Soft Delete**: Products are marked as `isActive: false` in MongoDB, but remain on-chain for immutability
2. **Transaction Logging**: All actions are logged in TransactionLog collection for audit
3. **Pagination**: All list endpoints support pagination
4. **Search**: Case-insensitive search on relevant fields
5. **Guest Mode**: Trace and search work without authentication for end-user convenience


