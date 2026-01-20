const hre = require("hardhat");

// Main seeding function
async function main() {
    // 1. Load the deployed contract address
    const contractAddress = require("../frontend/src/contract-address.json").SecureNotes;

    // 2. Attach to the deployed contract
    const SecureNotes = await hre.ethers.getContractFactory("SecureNotes");
    const secureNotes = SecureNotes.attach(contractAddress);

    console.log("Seeding icons to:", contractAddress);

    // 3. Define the initial icons to add to the shop
    const icons = [
        { type: 0, price: hre.ethers.parseEther("2") }, // HappyBirthday
        { type: 1, price: hre.ethers.parseEther("5") }, // Congratulations
        { type: 2, price: hre.ethers.parseEther("2") }, // MerryChristmas
        { type: 3, price: hre.ethers.parseEther("1") }, // Graduation
    ];

    // Check if icons are already seeded
    const count = await secureNotes.iconCount();
    if (count > 0n) {
        console.log("Icons already seeded. Skipping.");
        return;
    }

    // 4. Add each icon to the contract
    for (const icon of icons) {
        console.log(`Adding icon type ${icon.type} with price ${hre.ethers.formatEther(icon.price)} ETH`);
        const tx = await secureNotes.addIcon(icon.type, icon.price);
        await tx.wait(); // Wait for transaction confirmation
    }

    console.log("Icons added successfully!");
}

// Error handling
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
