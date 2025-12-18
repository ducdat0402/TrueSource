<!-- Danh sách rủi ro: -->
- Unauthorized Access (High): User không quyền gọi updateStatus, dẫn đến sửa data traceability. Liên kết: Contracts onlyRole.

- Reentrancy Attack (High): Hacker gọi recursive functions trong updateAiResult, rút tiền/gas. Liên kết: Smart contracts.

- Data Leak in Off-Chain (Medium): MongoDB exposed, leak AI results hoặc user email. Liên kết: Backend Express API.

- AI Misuse (Medium): Input fake data vào Hugging Face, tạo results sai lưu aiResults. Liên kết: Backend service gọi AI.

- Denial of Service (Low): Flood RabbitMQ queue với events emit, overload backend. Liên kết: Tích hợp real-time.

- Gas Limit Overflow (Medium): Events array quá dài trong Product, exceed gas khi push. Liên kết: Structs design.

- Key Management (High): Wallet private keys leak, cho phép signer giả mạo. Liên kết: User walletAddress.


<!-- Danh sách phân quyền : -->

- Admin-Quản trị viên (High Privilege): Cấp/thu hồi vai trò, cập nhậtAiResult. On-chain: DEFAULT_ADMIN_ROLE; Off-chain: Kiểm tra JWT trong Express middleware.

- Producer -Nhà sản xuất (Medium): AddProduct, updateStatus. Giảm rủi ro unauthorized bằng onlyRole(PRODUCER_ROLE).

- Distributor- Nhà phân phối (Medium): Update status vận chuyển. Tương tự Producer nhưng role riêng.

- Consumer - Người tiêu dùng(Low): Chỉ GetHistory. Off-chain: API public nhưng lọc dữ liệu.

- Logic Implement- Triển khai logic: Backend: app.use(authMiddleware); nếu (req.user.role !== 'Producer') báo lỗi. MongoDB: Truy vấn với {userId: req.user.id, role: req.user.role}.

<!-- kế hoạch bảo mật -->
- Encryption: Hash data trước lưu on-chain (SHA-256 cho qrCodeHash); Encrypt -  MongoDB fields (AES cho aiResults inputData). Giảm rủi ro data leak.

- Authentication: JWT ở backend (jsonwebtoken, expire 1h); Wallet signature ở contracts (msg.sender check). Tích hợp AI: Chỉ sau auth gọi Axios.

- Auditing: Log all transactions ở MongoDB TransactionLog; Use events emit cho monitoring (backend lưu logs).

- Other Measures: Reentrancy guard (nonReentrant modifier); Rate limit API - - Express; Redis TTL để temp data; RabbitMQ auth queues.

- Diagram (Text): Request → Backend JWT check → Role verify → Contract onlyRole → Emit secure → AI call (validated) → MongoDB store encrypted.