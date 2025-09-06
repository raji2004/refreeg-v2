const hre = require("hardhat");

async function main() {
  console.log("Deploying PetitionNFT contract...");
  
  const PetitionNFT = await hre.ethers.getContractFactory("PetitionNFT");
  const petitionNFT = await PetitionNFT.deploy();
  
  await petitionNFT.waitForDeployment();
  
  const contractAddress = await petitionNFT.getAddress();
  
  console.log("PetitionNFT deployed to:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  
  // Save contract address for frontend
  const fs = require('fs');
  const contractInfo = {
    address: contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('contract-address.json', JSON.stringify(contractInfo, null, 2));
  console.log("Contract info saved to contract-address.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
