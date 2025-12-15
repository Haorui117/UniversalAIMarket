import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Depositing POL from Polygon Amoy to ZetaChain...");
  console.log("Depositor:", deployer.address);

  const gatewayAddress = process.env.POLYGON_GATEWAY_ADDRESS;
  if (!gatewayAddress) {
    throw new Error("POLYGON_GATEWAY_ADDRESS not set");
  }

  // Gateway EVM interface for deposit (ZetaChain v2)
  // deposit(address receiver, RevertOptions calldata revertOptions)
  const gatewayAbi = [
    "function deposit(address receiver, tuple(address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) external payable",
  ];

  const gateway = new ethers.Contract(gatewayAddress, gatewayAbi, deployer);

  // Check current POL balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Current POL balance:", ethers.formatEther(balance), "POL");

  // Deposit 0.02 POL (keep some for gas)
  const depositAmount = ethers.parseEther("0.02");

  if (balance < depositAmount + ethers.parseEther("0.005")) {
    console.log("Insufficient balance for deposit + gas");
    return;
  }

  console.log("Depositing", ethers.formatEther(depositAmount), "POL to ZetaChain...");

  // RevertOptions struct - use deployer as revert address
  const revertOptions = {
    revertAddress: deployer.address,
    callOnRevert: false,
    abortAddress: ethers.ZeroAddress,
    revertMessage: "0x",
    onRevertGasLimit: 0
  };

  // Deposit native POL to ZetaChain
  const tx = await gateway.deposit(
    deployer.address, // receiver on ZetaChain
    revertOptions,
    { value: depositAmount }
  );

  console.log("Tx hash:", tx.hash);
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("Deposit confirmed in block:", receipt.blockNumber);
  console.log("");
  console.log("Cross-chain transfer initiated!");
  console.log("It may take 1-2 minutes to appear on ZetaChain as POL ZRC-20.");
  console.log("Track at: https://athens.explorer.zetachain.com/address/" + deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
