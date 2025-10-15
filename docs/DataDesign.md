//// ENTITIES
- Product: Collection trung tâm cho sản phẩm cần trace.

- Event: Collection cho các sự kiện chuỗi cung ứng (có thể embed vào Product nếu lịch sử ngắn).

- User: Collection cho người dùng.

- AI_Analysis: Collection cho kết quả AI (referencing đến Product).

- TransactionLog: Collection cho logs (referencing đến User/Product).

- CacheEntry: Không cần collection riêng vì Redis xử lý caching; nhưng nếu dùng MongoDB cho cache tạm (fallback), có thể tạo collection TTL (time-to-live).

///// RELATIONS
P- roduct embeds_many Events (Embedding: Nhúng array Events vào Product để truy vấn lịch sử nhanh, tránh joins – phù hợp NoSQL).

- User references_many Products (Referencing: User lưu array ObjectId của Products để quản lý sở hữu, dễ query).

- Product references_one AI_Analysis (Referencing: Product lưu ObjectId của AI_Analysis, vì AI results có thể lớn và cập nhật riêng).

- Event belongs_to Product (Embedding: Event không cần riêng nếu nhúng vào Product; nếu riêng, ref bằng ObjectId).

- User embeds_many TransactionLogs (Embedding: Nhúng logs vào User nếu ít; hoặc referencing nếu logs lớn).

- AI_Analysis references Product (Referencing: AI_Analysis lưu ObjectId của Product để liên kết ngược).

- CacheEntry references Product or Event (Referencing: Nếu dùng MongoDB cho cache, lưu ObjectId; nhưng ưu tiên Redis cho performance).

//////// PROPERTIES OF ENTITIES
- Product (Collection: products; On-chain chính, nhưng mirror off-chain cho query nhanh):

_id: ObjectId (Auto-generated Primary Key).
origin: String (Nguồn gốc ban đầu, ví dụ: "Nông trại Đắk Lắk").
createdAt: Date (Timestamp tạo, dùng new Date()).
currentStatus: String (Trạng thái hiện tại, ví dụ: "Đã vận chuyển").
events: Array of Embedded Documents (Nhúng array Events để trace lịch sử – tối ưu NoSQL).
qrCodeHash: String (Hash của QR code để xác thực).
aiResults: Object (Hỗ trợ AI: Lưu kết quả như { riskLevel: String, anomalyScore: Number, confidence: Number } – mapping đến output từ AI_Analysis; ví dụ: { "riskLevel": "low", "anomalyScore": 0.05 } từ model Hugging Face).

- Event (Không cần collection riêng nếu embed vào Product; nếu riêng cho dữ liệu lớn: Collection events):

_id: ObjectId.
productId: ObjectId (Ref đến Product nếu không embed).
type: String (Loại event, ví dụ: "Thu hoạch").
timestamp: Date.
location: String (GPS hoặc địa chỉ).
details: String (Chi tiết).
signer: String (Wallet address).
- User (Collection: users; Off-chain):

_id: ObjectId.
username: String.
role: String (Enum: "Producer", "Distributor", "Consumer").
walletAddress: String.
email: String.
createdAt: Date.
products: Array of ObjectId (Ref đến Products sở hữu).

- AI_Analysis (Collection: ai_analyses; Off-chain cho dữ liệu AI lớn):

_id: ObjectId.
productId: ObjectId (Ref đến Product).
analysisType: String (Ví dụ: "Anomaly Detection").
results: Object (Kết quả chi tiết, ví dụ: { prediction: String, confidence: Number } – hỗ trợ AI).
inputData: Object (Input cho model, ví dụ: { history: Array }).
timestamp: Date.

- TransactionLog (Collection: transaction_logs; Off-chain):

_id: ObjectId.
userId: ObjectId (Ref đến User).
action: String (Ví dụ: "Add Product").
txHash: String (Hash blockchain).
timestamp: Date.

- CacheEntry (Không dùng MongoDB chính; ưu tiên Redis. Nếu fallback: Collection cache_entries với TTL index):

_id: ObjectId.
key: String (Ví dụ: "product:123").
value: Object (Dữ liệu cache).
expiry: Date (Thời gian hết hạn).