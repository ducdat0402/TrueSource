const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("TrueSource Contract Tests", function () {
let TrueSource;
let contract;
let owner, producer, consumer;
beforeEach(async function () {
[owner, producer, consumer] = await ethers.getSigners();
TrueSource = await ethers.getContractFactory("TrueSource");
contract = await TrueSource.deploy();
// Grant PRODUCER_ROLE to producer account for testing
const PRODUCER_ROLE = await contract.PRODUCER_ROLE();
await contract.grantRole(PRODUCER_ROLE, producer.address);
});
it("Should deploy the contract and grant roles to owner", async function () {
const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
const PRODUCER_ROLE = await contract.PRODUCER_ROLE();
expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
expect(await contract.hasRole(PRODUCER_ROLE, owner.address)).to.be.true;
});
it("Should add a new product with producer role", async function () {
const origin = "Test Origin";
const qrHash = "Test QR Hash";
await expect(contract.connect(producer).addProduct(origin, qrHash))
.to.emit(contract, "ProductCreated")
.withArgs(1, origin);
const p = await contract.products(1);
expect(p.id).to.equal(1);
expect(p.origin).to.equal(origin);
expect(p.currentStatus).to.equal("Created");
expect(p.qrCodeHash).to.equal(qrHash);
expect(p.createdAt).to.be.gt(0);
});
it("Should revert addProduct if not producer role", async function () {
const origin = "Test Origin";
const qrHash = "Test QR Hash";
    const PRODUCER_ROLE = await contract.PRODUCER_ROLE();
    await expect(contract.connect(consumer).addProduct(origin, qrHash))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")
      .withArgs(consumer.address, PRODUCER_ROLE);
});
it("Should update status and add event with producer role", async function () {
// First add a product
await contract.connect(producer).addProduct("Origin", "QR");
const newStatus = "Updated";
const eventType = "Test Type";
const location = "Test Location";
const details = "Test Details";
await expect(contract.connect(producer).updateStatus(1, newStatus, eventType, location, details))
.to.emit(contract, "ProductUpdated")
.withArgs(1, newStatus);
const [origin, events, currentStatus] = await contract.getHistory(1);
expect(currentStatus).to.equal(newStatus);
expect(events.length).to.equal(1);
expect(events[0].eventType).to.equal(eventType);
expect(events[0].location).to.equal(location);
expect(events[0].details).to.equal(details);
expect(events[0].signer).to.equal(producer.address);
expect(events[0].timestamp).to.be.gt(0);
});
it("Should revert updateStatus if not producer role", async function () {
// Add product first
await contract.connect(producer).addProduct("Origin", "QR");
    const PRODUCER_ROLE = await contract.PRODUCER_ROLE();
    await expect(contract.connect(consumer).updateStatus(1, "Updated", "Type", "Loc", "Details"))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")
      .withArgs(consumer.address, PRODUCER_ROLE);
});
it("Should update and get AI result with admin role", async function () {
// Add product first
await contract.connect(producer).addProduct("Origin", "QR");
const analysisKey = 1;
const resultJson = '{"risk":"low", "score":0.05}';
await contract.updateAiResult(1, analysisKey, resultJson);
const aiResult = await contract.getAiResult(1, analysisKey);
expect(aiResult).to.equal(resultJson);
});
it("Should revert updateAiResult if not admin role", async function () {
// Add product first
await contract.connect(producer).addProduct("Origin", "QR");
const analysisKey = 1;
const resultJson = '{"risk":"low"}';
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    await expect(contract.connect(producer).updateAiResult(1, analysisKey, resultJson))
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")
      .withArgs(producer.address, DEFAULT_ADMIN_ROLE);
});
});