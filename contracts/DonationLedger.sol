// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Append-only log of RefreeG donation records. Nothing can be updated or deleted;
/// refunds and chargebacks are recorded as new entries with kind = REVERSAL.
contract DonationLedger {
    uint8 public constant KIND_DONATION = 0;
    uint8 public constant KIND_REVERSAL = 1;

    struct Entry {
        bytes32 entryId;
        bytes32 causeId;
        bytes32 payloadHash;
        uint256 amountKobo;
        uint8 kind;
    }

    address public owner;
    mapping(address => bool) public recorders;
    mapping(bytes32 => bytes32) public payloadHashOf;

    event DonationRecorded(
        bytes32 indexed entryId,
        bytes32 indexed causeId,
        bytes32 payloadHash,
        uint256 amountKobo,
        uint8 kind,
        uint256 recordedAt
    );
    event RecorderSet(address indexed recorder, bool allowed);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyRecorder() {
        require(recorders[msg.sender], "not recorder");
        _;
    }

    constructor(address initialRecorder) {
        owner = msg.sender;
        recorders[initialRecorder] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit RecorderSet(initialRecorder, true);
    }

    function setRecorder(address recorder, bool allowed) external onlyOwner {
        recorders[recorder] = allowed;
        emit RecorderSet(recorder, allowed);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function isRecorded(bytes32 entryId) external view returns (bool) {
        return payloadHashOf[entryId] != bytes32(0);
    }

    /// Already-recorded entries are skipped so a retried batch never reverts.
    function recordBatch(Entry[] calldata entries) external onlyRecorder {
        for (uint256 i = 0; i < entries.length; i++) {
            Entry calldata e = entries[i];
            require(e.payloadHash != bytes32(0), "empty hash");
            require(e.kind <= KIND_REVERSAL, "bad kind");
            if (payloadHashOf[e.entryId] != bytes32(0)) continue;
            payloadHashOf[e.entryId] = e.payloadHash;
            emit DonationRecorded(e.entryId, e.causeId, e.payloadHash, e.amountKobo, e.kind, block.timestamp);
        }
    }
}
