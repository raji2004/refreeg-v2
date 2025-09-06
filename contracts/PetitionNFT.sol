// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PetitionNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    
    struct Petition {
        uint256 id;
        string title;
        string description;
        string imageURI; // IPFS hash for petition image
        address creator;
        uint256 createdAt;
        bool isActive;
        uint256 signatureCount;
    }
    
    struct Signature {
        uint256 petitionId;
        address signer;
        string message;
        uint256 timestamp;
        bool verified;
    }
    
    mapping(uint256 => Petition) public petitions;
    mapping(uint256 => Signature) public signatures;
    mapping(address => uint256[]) public userSignatures;
    mapping(uint256 => uint256[]) public petitionSignatures;
    
    event PetitionCreated(uint256 indexed petitionId, address indexed creator, string title);
    event PetitionSigned(uint256 indexed petitionId, address indexed signer, uint256 indexed tokenId);
    
    constructor() ERC721("Petition Signature", "PET") Ownable(msg.sender) {}
    
    function createPetition(
        string memory _title,
        string memory _description,
        string memory _imageURI
    ) external returns (uint256) {
        _tokenIds.increment();
        uint256 petitionId = _tokenIds.current();
        
        petitions[petitionId] = Petition({
            id: petitionId,
            title: _title,
            description: _description,
            imageURI: _imageURI,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true,
            signatureCount: 0
        });
        
        emit PetitionCreated(petitionId, msg.sender, _title);
        return petitionId;
    }
    
    function signPetition(
        uint256 _petitionId,
        string memory _message
    ) external returns (uint256) {
        require(petitions[_petitionId].isActive, "Petition is not active");
        require(petitions[_petitionId].creator != msg.sender, "Creator cannot sign own petition");
        
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        
        _mint(msg.sender, tokenId);
        
        signatures[tokenId] = Signature({
            petitionId: _petitionId,
            signer: msg.sender,
            message: _message,
            timestamp: block.timestamp,
            verified: true
        });
        
        userSignatures[msg.sender].push(tokenId);
        petitionSignatures[_petitionId].push(tokenId);
        
        petitions[_petitionId].signatureCount++;
        
        emit PetitionSigned(_petitionId, msg.sender, tokenId);
        return tokenId;
    }
    
    function getPetition(uint256 _petitionId) external view returns (Petition memory) {
        return petitions[_petitionId];
    }
    
    function getSignature(uint256 _tokenId) external view returns (Signature memory) {
        return signatures[_tokenId];
    }
    
    function getUserSignatures(address _user) external view returns (uint256[] memory) {
        return userSignatures[_user];
    }
    
    function getPetitionSignatures(uint256 _petitionId) external view returns (uint256[] memory) {
        return petitionSignatures[_petitionId];
    }
    
    function deactivatePetition(uint256 _petitionId) external {
        require(petitions[_petitionId].creator == msg.sender, "Only creator can deactivate");
        petitions[_petitionId].isActive = false;
    }
    
    function _baseURI() internal pure override returns (string memory) {
        return "https://api.refreeg.com/nft/";
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        // Return the Refreeg logo for all signature NFTs
        // This will be the image displayed in MetaMask and OpenSea
        // Using a reliable web URL that will always be accessible
        return "https://media.licdn.com/dms/image/v2/D4D0BAQHG7k3vUcLEAw/company-logo_200_200/company-logo_200_200/0/1722977925330/refreeg_logo?e=2147483647&v=beta&t=AqECeGnjkNT_AAUTR4ddRpkz75LtbBrLAyioaeqcckY";
    }
}
