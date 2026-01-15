const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const SecureNotes = await hre.ethers.getContractFactory("SecureNotes");
    const secureNotes = await SecureNotes.deploy();

    await secureNotes.waitForDeployment();

    const address = await secureNotes.getAddress();
    console.log(`SecureNotes deployed to: ${address}`);

    // Save address to a file for the frontend to read
    const configPath = path.join(__dirname, "../frontend/src");
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
    }

    fs.writeFileSync(
        path.join(configPath, "contract-address.json"),
        JSON.stringify({ SecureNotes: address }, undefined, 2)
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
