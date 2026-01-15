const hre = require("hardhat");

async function main() {
    const contractAddress = require("../frontend/src/contract-address.json").SecureNotes;
    const SecureNotes = await hre.ethers.getContractFactory("SecureNotes");
    const secureNotes = SecureNotes.attach(contractAddress);

    console.log("Seeding icons to:", contractAddress);

    const icons = [
        { type: 0, price: hre.ethers.parseEther("0.01") }, // BuonCompleanno
        { type: 1, price: hre.ethers.parseEther("0.02") }, // AuguriM
        { type: 2, price: hre.ethers.parseEther("0.02") }, // AuguriF
        { type: 3, price: hre.ethers.parseEther("0.05") }, // Auguri
        { type: 4, price: hre.ethers.parseEther("0.1") },  // BuonNatale
    ];

    for (const icon of icons) {
        console.log(`Adding icon type ${icon.type} with price ${hre.ethers.formatEther(icon.price)} ETH`);
        const tx = await secureNotes.addIcon(icon.type, icon.price);
        await tx.wait();
    }

    console.log("Icons added successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
