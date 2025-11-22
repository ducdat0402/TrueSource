// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";  // Cho roles sau

contract TrueSource is AccessControl {
     // Define PRODUCER_ROLE as a bytes32 constant
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    // Struct Event (tương tự embedded document ở MongoDB)
    struct Event {
        string eventType;  // Loại event, ví dụ: "Thu hoạch"
        uint timestamp;    // Thời gian (block.timestamp)
        string location;   // GPS hoặc địa chỉ
        string details;    // Chi tiết
        address signer;    // Wallet người ký
    }

    // Struct Product (trung tâm, với events array và aiResults mapping)
    struct Product {
        uint id;           // ID tự tăng
        string origin;     // Nguồn gốc
        uint createdAt;    // Timestamp tạo
        string currentStatus;  // Trạng thái hiện tại
        Event[] events;    // Array lịch sử (embedding cho trace)
        string qrCodeHash; // Hash QR
        mapping(uint => string) aiResults;  // Mapping cho AI (key: analysisID, value: JSON string như {"riskLevel": "low", "score": 0.05})
    }

    // Mapping products (như collection ở MongoDB)
    mapping(uint => Product) public products;
    uint public productCounter;  // Counter cho ID mới

    // Events để trigger backend (sync MongoDB và AI)
    event ProductCreated(uint indexed id, string origin);
    event ProductUpdated(uint indexed id, string newStatus);
// Constructor để setup roles
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);  // Admin ban đầu
        _grantRole(PRODUCER_ROLE, msg.sender);  // Ví dụ, grant role
    }

    // Hàm addProduct (tạo mới)
    function addProduct(string memory _origin, string memory _qrHash) public onlyRole(PRODUCER_ROLE) {
        productCounter++;
        Product storage p = products[productCounter];
        p.id = productCounter;
        p.origin = _origin;
        p.createdAt = block.timestamp;
        p.currentStatus = "Created";
        p.qrCodeHash = _qrHash;
        // aiResults mapping init rỗng, backend update sau
        emit ProductCreated(productCounter, _origin);  // Trigger backend sync MongoDB
    }

    // Hàm updateStatus (cập nhật với event mới)
    function updateStatus(uint _id, string memory _newStatus, string memory _eventType, string memory _location, string memory _details) public onlyRole(PRODUCER_ROLE) {
        Product storage p = products[_id];
     
        Event memory newEvent = Event({
            eventType: _eventType,
            timestamp: block.timestamp,
            location: _location,
            details: _details,
            signer: msg.sender
        });
        p.events.push(newEvent);
        p.currentStatus = _newStatus;
        emit ProductUpdated(_id, _newStatus);  // Trigger backend gọi AI và sync MongoDB
    }

    // Hàm getHistory (truy vết)
    function getHistory(uint _id) public view returns (string memory origin, Event[] memory events, string memory currentStatus) {
        Product storage p = products[_id];
        return (p.origin, p.events, p.currentStatus);
        // aiResults có thể trả riêng nếu cần, dùng hàm khác cho mapping
    }

    // Hàm riêng cho getAiResults (vì mapping không trả trực tiếp)
    function getAiResult(uint _id, uint _analysisKey) public view returns (string memory) {
        return products[_id].aiResults[_analysisKey];
    }
    // Hàm updateAiResult (tích hợp AI off-chain, backend gọi transaction này sau phân tích)
    function updateAiResult(uint _id, uint _analysisKey, string memory _resultJson) public onlyRole(DEFAULT_ADMIN_ROLE) {
        Product storage p = products[_id];
        p.aiResults[_analysisKey] = _resultJson;  // Lưu JSON từ AI, ví dụ: '{"risk": "low"}'
    }
}