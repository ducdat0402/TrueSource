const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying from:", deployer.address);
    console.log("Network:", hre.network.name);
  
    const TrueSource = await ethers.getContractFactory("TrueSource");
    const contract = await TrueSource.deploy();
    await contract.waitForDeployment();
  
    const contractAddress = await contract.getAddress();
    console.log("Deployed to:", contractAddress);
    
    // Verify on Etherscan if not on local network
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Waiting for block confirmations...");
        await contract.deploymentTransaction()?.wait(5);
        
        try {
            console.log("Verifying contract on Etherscan...");
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [],
            });
            console.log("Contract verified on Etherscan!");
            console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log("Contract already verified on Etherscan");
            } else {
                console.log("Error verifying contract:", error.message);
            }
        }
    } else {
        console.log("Local network - skipping Etherscan verification");
    }
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });