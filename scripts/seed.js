const hre = require("hardhat");

async function main() {
    const contractAddress = require("../frontend/src/contract-address.json").SecureNotes;
    const SecureNotes = await hre.ethers.getContractFactory("SecureNotes");
    const secureNotes = SecureNotes.attach(contractAddress);

    console.log("Seeding icons to:", contractAddress);

    const icons = [
        { type: 0, price: hre.ethers.parseEther("2") }, // HappyBirthday
        { type: 1, price: hre.ethers.parseEther("5") }, // Congratulations
        { type: 2, price: hre.ethers.parseEther("2") }, // MerryChristmas
        { type: 3, price: hre.ethers.parseEther("1") }, // Graduation
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
