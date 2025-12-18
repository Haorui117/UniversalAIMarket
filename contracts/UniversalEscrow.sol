// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title UniversalEscrow
 * @notice Chain-agnostic NFT escrow contract for cross-chain trading via ZetaChain
 * @dev This contract is designed to be deployed on ANY EVM chain where NFTs are hosted.
 *      The same code works on Polygon, Ethereum, BSC, Base, Arbitrum, etc.
 *      Only the constructor parameter (gateway address) differs per chain.
 *
 * Deployment pattern:
 *   - Deploy ONE instance per chain where you want to escrow NFTs
 *   - Pass the ZetaChain Gateway address for that specific chain
 *   - The contract code is 100% universal, no chain-specific logic
 *
 * Example:
 *   - Polygon Amoy: new UniversalEscrow(0x0c487a766110c85d301d96e33579c5b317fa4995)
 *   - Base Sepolia: new UniversalEscrow(0x0c487a766110c85d301d96e33579c5b317fa4995)
 *   - Ethereum Sepolia: new UniversalEscrow(<sepolia_gateway_address>)
 */
contract UniversalEscrow is IERC721Receiver {
    /// @notice The ZetaChain Gateway address for this chain
    /// @dev This is the only chain-specific parameter. Get it from ZetaChain docs.
    address public immutable gateway;

    /// @notice Contract owner for admin functions
    address public owner;

    /// @notice Tracking to prevent replay attacks
    mapping(bytes32 => bool) public processedDeals;

    /// @notice Escrow state: nftContract => tokenId => depositor address
    mapping(address => mapping(uint256 => address)) public escrowedBy;

    /// @notice Emitted when an NFT is deposited into escrow
    event NFTDeposited(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed depositor
    );

    /// @notice Emitted when an NFT is released from escrow to a buyer
    event NFTReleased(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed recipient,
        bytes32 dealId
    );

    /**
     * @notice Constructor - deploy with the ZetaChain Gateway address for this chain
     * @param _gateway The ZetaChain Gateway address (chain-specific, get from docs)
     */
    constructor(address _gateway) {
        gateway = _gateway;
        owner = msg.sender;
    }

    /// @notice Modifier to restrict to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /// @notice Transfer ownership to a new address
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Admin function to release NFT (for recovery/emergency purposes)
     * @param recipient The address to receive the NFT
     * @param nftContract The NFT contract address
     * @param tokenId The token ID to transfer
     */
    function adminRelease(
        address recipient,
        address nftContract,
        uint256 tokenId
    ) external onlyOwner {
        require(escrowedBy[nftContract][tokenId] != address(0), "Not escrowed");
        IERC721(nftContract).transferFrom(address(this), recipient, tokenId);
        delete escrowedBy[nftContract][tokenId];
        emit NFTReleased(nftContract, tokenId, recipient, bytes32(0));
    }

    /**
     * @notice Deposit an NFT into escrow (seller calls this)
     * @dev Caller must approve this contract before calling
     * @param nftContract The NFT contract address
     * @param tokenId The token ID to deposit
     */
    function deposit(address nftContract, uint256 tokenId) external {
        require(escrowedBy[nftContract][tokenId] == address(0), "Already escrowed");
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        escrowedBy[nftContract][tokenId] = msg.sender;
        emit NFTDeposited(nftContract, tokenId, msg.sender);
    }

    /**
     * @notice Release NFT to buyer - called via ZetaChain cross-chain message
     * @dev Only callable by the ZetaChain Gateway (after cross-chain payment verified)
     * @param recipient The address to receive the NFT
     * @param nftContract The NFT contract address
     * @param tokenId The token ID to transfer
     * @param dealId Unique deal identifier to prevent replay attacks
     */
    function release(
        address recipient,
        address nftContract,
        uint256 tokenId,
        bytes32 dealId
    ) external {
        // Security: Only ZetaChain Gateway can trigger release
        require(msg.sender == gateway, "Only gateway");

        // Prevent replay attacks
        require(!processedDeals[dealId], "Deal already processed");
        processedDeals[dealId] = true;

        // Verify NFT is escrowed
        require(escrowedBy[nftContract][tokenId] != address(0), "Not escrowed");

        // Transfer NFT to recipient
        IERC721(nftContract).transferFrom(address(this), recipient, tokenId);

        // Clear escrow state
        delete escrowedBy[nftContract][tokenId];

        emit NFTReleased(nftContract, tokenId, recipient, dealId);
    }

    /**
     * @notice Required to receive ERC721 tokens via safeTransferFrom
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
