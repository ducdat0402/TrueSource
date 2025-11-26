// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TrueSource is AccessControl {
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");

    struct Event {
        string eventType;
        uint timestamp;
        string location;
        string details;
        address signer;
    }

    struct Product {
        uint id;
        string origin;
        string productName;
        string category;
        uint createdAt;
        string currentStatus;
        Event[] events;
        string qrCodeHash;
        mapping(uint => string) aiResults;  // AI results JSON
    }

    mapping(uint => Product) public products;
    uint public productCounter;

    event ProductCreated(uint indexed id, string origin);
    event ProductUpdated(uint indexed id, string newStatus);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRODUCER_ROLE, msg.sender);
    }

    function addProduct(string memory _origin, string memory _productName, string memory _category, string memory _qrHash) public onlyRole(PRODUCER_ROLE) {
        productCounter++;
        Product storage p = products[productCounter];
        p.id = productCounter;
        p.origin = _origin;
        p.productName = _productName;
        p.category = _category;
        p.createdAt = block.timestamp;
        p.currentStatus = "Created";
        p.qrCodeHash = _qrHash;
        emit ProductCreated(productCounter, _origin);  // Trigger backend
    }

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
        emit ProductUpdated(_id, _newStatus);  // Trigger AI/backend
    }

    function getHistory(uint _id) public view returns (string memory origin, Event[] memory events, string memory currentStatus) {
        Product storage p = products[_id];
        return (p.origin, p.events, p.currentStatus);
    }

    function getAiResult(uint _id, uint _analysisKey) public view returns (string memory) {
        return products[_id].aiResults[_analysisKey];
    }

    function updateAiResult(uint _id, uint _analysisKey, string memory _resultJson) public onlyRole(DEFAULT_ADMIN_ROLE) {
        Product storage p = products[_id];
        p.aiResults[_analysisKey] = _resultJson;
    }
}