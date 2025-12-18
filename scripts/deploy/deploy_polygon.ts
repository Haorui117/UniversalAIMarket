import { ethers } from "hardhat";
import type { MockWeaponNFT, UniversalEscrow } from "../../typechain-types";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  // When deployer and buyer use the same key, we only have 2 unique signers
  // Seller is always the last signer in the array
  const seller = signers[signers.length - 1];

  console.log("Deploying Polygon contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Seller:", seller.address);

  // Deploy MockWeaponNFT (demo NFT - can be replaced with any ERC-721)
  const MockWeaponNFT = await ethers.getContractFactory("MockWeaponNFT");
  const nft = (await MockWeaponNFT.deploy()) as unknown as MockWeaponNFT;
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("MockWeaponNFT deployed to:", nftAddress);

  // Deploy UniversalEscrow
  // This same contract code works on ANY EVM chain - only the gateway address differs
  const gatewayAddress = process.env.POLYGON_GATEWAY_ADDRESS;
  if (!gatewayAddress) {
    throw new Error("POLYGON_GATEWAY_ADDRESS not set in environment");
  }

  const UniversalEscrow = await ethers.getContractFactory("UniversalEscrow");
  const escrow = (await UniversalEscrow.deploy(
    gatewayAddress
  )) as unknown as UniversalEscrow;
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("UniversalEscrow deployed to:", escrowAddress);

  // Mint NFTs to seller and deposit to escrow (demo-ready tokenIds)
  const tokenIds = [1, 7];

  const nftAsSeller = nft.connect(seller) as MockWeaponNFT;
  const escrowAsSeller = escrow.connect(seller) as UniversalEscrow;

  for (const tokenId of tokenIds) {
    const mintTx = await nft.mint(seller.address, tokenId);
    await mintTx.wait();
    console.log(`Minted tokenId ${tokenId} to seller (${seller.address})`);

    const approveTx = await nftAsSeller.approve(escrowAddress, tokenId);
    await approveTx.wait();
    console.log(`Seller approved escrow for tokenId ${tokenId}`);

    const depositTx = await escrowAsSeller.deposit(nftAddress, tokenId);
    await depositTx.wait();
    console.log(`NFT ${tokenId} deposited to escrow`);

    const nftOwner = await nft.ownerOf(tokenId);
    console.log(`NFT ${tokenId} owner is now: ${nftOwner}`);
  }

  // Output addresses for .env
  console.log("\n=== Add to .env ===");
  console.log(`POLYGON_MOCK_NFT=${nftAddress}`);
  console.log(`POLYGON_ESCROW=${escrowAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
