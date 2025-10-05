# TrueSource
### Mô Tả Dự Án: TrueSource - Hệ Thống Truy Xuất Nguồn Gốc Sản Phẩm Dựa Trên Blockchain

#### 1. Giới Thiệu Dự Án
TrueSource là một hệ thống truy xuất nguồn gốc (traceability system) dựa trên công nghệ blockchain, nhằm đảm bảo tính minh bạch, an toàn và chống gian lận trong chuỗi cung ứng. Dự án tập trung vào việc theo dõi nguồn gốc sản phẩm từ giai đoạn sản xuất ban đầu đến tay người tiêu dùng, đặc biệt phù hợp với các ngành như nông nghiệp, thực phẩm, dược phẩm hoặc hàng hóa cao cấp (ví dụ: cà phê Việt Nam hoặc thủy sản). 

Mục đích chính:
- Tăng cường lòng tin giữa các bên tham gia chuỗi cung ứng bằng cách lưu trữ dữ liệu bất biến trên blockchain.
- Phát hiện sớm các vấn đề như hàng giả, ô nhiễm hoặc vi phạm quy định.
- Tích hợp các công nghệ hiện đại để đạt yêu cầu của một đồ án chuyên ngành CNTT, bao gồm blockchain, AI, containerization (Docker), quản lý code (Git), và các công nghệ nâng cao như Redis, RabbitMQ, CI/CD.

Dự án phải là một prototype đầy đủ, có thể deploy và test trên môi trường thực tế, với source code được quản lý chuyên nghiệp. Cuối cùng, hệ thống phải được containerize bằng Docker để dễ dàng chạy trên bất kỳ máy nào (các nhóm khác có thể gửi bản Docker để chạy thực tế).

#### 2. Yêu Cầu Chung Của Đồ Án Chuyên Ngành
Để đạt yêu cầu cao của đồ án chuyên ngành, dự án phải:
- Tích hợp nhiều chức năng nâng cao, bao gồm AI (sử dụng model AI sẵn để phân tích dữ liệu).
- Sử dụng Docker và Docker Compose để triển khai và deploy (hệ thống phải chạy được qua lệnh `docker-compose up`).
- Quản lý source code bằng Git (sử dụng GitHub hoặc GitLab, với branch, pull requests, và commit history rõ ràng).
- Tích hợp ít nhất 2-3 công nghệ tùy chọn từ danh sách: Redis (caching), RabbitMQ (message queue cho real-time updates), SignalR (real-time web communication), Low-code/No-code platforms (ví dụ: n8n cho workflow automation), CI/CD pipelines (Jenkins, GitHub Actions, hoặc GitLab CI cho tự động build/test/deploy), ElasticSearch (tìm kiếm dữ liệu nhanh chóng).
- Đảm bảo tính bảo mật (authentication, encryption), hiệu suất (scalability), và tài liệu đầy đủ (user manual, technical report, demo video).
- Thời gian hoàn thành: 10 tuần, với timeline chi tiết (xem phần 6).

#### 3. Các Chức Năng Chính Của Hệ Thống
Hệ thống phải hỗ trợ các chức năng sau, được chia thành cốt lõi và nâng cao:

**Chức Năng Cốt Lõi (Blockchain-Based Traceability):**
- **Ghi nhận dữ liệu nguồn gốc**: Cho phép các bên (nhà sản xuất, nhà phân phối) nhập dữ liệu sản phẩm (nguồn nguyên liệu, quá trình sản xuất, vận chuyển) và lưu trữ bất biến trên blockchain (sử dụng smart contracts bằng Solidity trên Ethereum hoặc Hyperledger).
- **Truy vết thời gian thực**: Người dùng quét QR code hoặc NFC để xem lịch sử đầy đủ của sản phẩm (từ nguồn đến hiện tại), hiển thị qua app web/mobile.
- **Xác thực và kiểm tra**: Sử dụng hợp đồng thông minh để tự động xác thực dữ liệu, cảnh báo nếu có bất thường (ví dụ: sản phẩm bị thay đổi không hợp lệ).
- **Quản lý người dùng**: Phân quyền truy cập (admin, nhà sản xuất, người tiêu dùng) với authentication (JWT hoặc OAuth).

**Chức Năng Nâng Cao (Tích Hợp AI và Công Nghệ Khác):**
- **Tích hợp AI**: Sử dụng model AI sẵn (từ Hugging Face, TensorFlow.js, hoặc Google Cloud AI) để phân tích dữ liệu traceability, ví dụ: Dự đoán rủi ro hàng giả dựa trên pattern dữ liệu, phân tích sentiment từ feedback người dùng, hoặc phát hiện bất thường (anomaly detection) trong chuỗi cung ứng.
- **Real-time Updates**: Sử dụng RabbitMQ hoặc SignalR để gửi thông báo thời gian thực (push notifications) khi dữ liệu thay đổi hoặc phát hiện vấn đề.
- **Caching và Tìm Kiếm**: Tích hợp Redis cho caching dữ liệu truy vết (giảm tải blockchain), và ElasticSearch cho tìm kiếm nhanh lịch sử sản phẩm.
- **Automation Workflow**: Sử dụng Low-code/No-code như n8n hoặc Mendix để tự động hóa quy trình (ví dụ: tự động cập nhật dữ liệu từ IoT sensors).
- **CI/CD Pipeline**: Tích hợp GitHub Actions hoặc Jenkins để tự động build, test, và deploy code mỗi khi commit (bao gồm Docker images).
- **Tích hợp IoT (Tùy Chọn)**: Kết nối với thiết bị IoT để tự động thu thập dữ liệu (như nhiệt độ vận chuyển).

#### 4. Công Nghệ Stack Gợi Ý
- **Blockchain**: Ethereum (Solidity cho smart contracts), Web3.js để kết nối.
- **Backend**: Node.js/Express.js (hoặc Laravel nếu dùng PHP), với API RESTful hoặc GraphQL.
- **Frontend**: React.js/Vue.js cho web/app, với thư viện như qrcode.react cho QR.
- **Database**: Blockchain cho dữ liệu bất biến; MySQL/Firestore cho off-chain data nếu cần.
- **Containerization**: Docker (Dockerfile cho từng service), Docker Compose (cho multi-container: backend, frontend, Redis, etc.).
- **Quản Lý Code**: Git (GitHub repo với branches: main, dev, feature/AI).
- **Công Nghệ Tùy Chọn**: Redis, RabbitMQ, SignalR, n8n, GitHub Actions, ElasticSearch.
- **Công Cụ Phát Triển**: Remix IDE/Ganache cho test blockchain, Postman/Swagger cho API docs, Figma cho UI/UX design.

#### 5. Các Bước Cần Làm Để Hoàn Thành Dự Án
Dự án phải được triển khai theo các bước sau để đảm bảo tính chuyên nghiệp:
1. **Nghiên cứu và Thiết Kế**: Ôn kiến thức, vẽ ERD/UML, thiết kế smart contracts và tích hợp AI.
2. **Phát Triển Backend**: Viết smart contracts, tích hợp AI và công nghệ tùy chọn (Redis/RabbitMQ).
3. **Phát Triển Frontend**: Xây dựng UI, tích hợp QR và real-time features.
4. **Tích Hợp và Test**: Kết nối toàn bộ, test unit/integration/security (sử dụng Mocha/Mythril).
5. **Deploy với Docker**: Viết Dockerfile và docker-compose.yml, deploy lên cloud (AWS/Heroku) hoặc local.
6. **CI/CD Setup**: Cấu hình pipeline để tự động hóa.
7. **Tài Liệu và Demo**: Viết report, manual, video demo (chạy Docker trên môi trường thật).
8. **Review và Tối Ưu**: Test với user thực tế, fix bugs, đảm bảo scalability.

#### 6. Timeline Gợi Ý (10 Tuần)
- **Tuần 1-2**: Nghiên cứu, thiết kế hệ thống và lập Git repo.
- **Tuần 3-4**: Phát triển backend và smart contracts, tích hợp AI.
- **Tuần 5-6**: Phát triển frontend, tích hợp công nghệ tùy chọn (Redis, RabbitMQ).
- **Tuần 7**: Test và debug, setup CI/CD.
- **Tuần 8**: Deploy với Docker, tối ưu hóa.
- **Tuần 9-10**: Tài liệu, demo, và hoàn thiện (test Docker từ nhóm khác).

#### 7. Tiêu Chí Đánh Giá Đồ Án
- Hoàn thành tất cả chức năng cốt lõi và ít nhất 50% nâng cao.
- Source code sạch, có comments, và push lên GitHub.
- Hệ thống chạy ổn định qua Docker, không lỗi khi deploy.
- Tài liệu đầy đủ: Report 20-30 trang, bao gồm mã nguồn, diagram, và lessons learned.
- Demo: Chạy thực tế, chứng minh tích hợp AI và blockchain.
