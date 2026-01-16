const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Main deployment function
async function main() {
    // 1. Get the contract factory
    const SecureNotes = await hre.ethers.getContractFactory("SecureNotes");

    // 2. Deploy the contract
    const secureNotes = await SecureNotes.deploy();

    // 3. Wait for the deployment transaction to be mined
    await secureNotes.waitForDeployment();

    // 4. Get the deployed contract address
    const address = await secureNotes.getAddress();
    console.log(`SecureNotes deployed to: ${address}`);

    // 5. Save the address to a file so the frontend can read it
    const configPath = path.join(__dirname, "../frontend/src");
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
    }

    fs.writeFileSync(
        path.join(configPath, "contract-address.json"),
        JSON.stringify({ SecureNotes: address }, undefined, 2)
    );
}

// Error handling pattern for async/await
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
