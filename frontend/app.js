const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Localhost deployment

let provider;
let signer;
let contract;
let currentAddress;

const IconTypes = [
    "HappyBirthday",
    "Congratulations",
    "MerryChristmas",
    "Graduation"
];

const connectBtn = document.getElementById('connectBtn');
const userStatus = document.getElementById('userStatus');
const iconGrid = document.getElementById('iconGrid');
const notesList = document.getElementById('notesList');

// Initialize
async function init() {
    console.log("Initializing...", "window.ethereum type:", typeof window.ethereum);
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        // Auto-connect if already authorized
        try {
            const accounts = await provider.send("eth_accounts", []);
            if (accounts.length > 0) {
                currentAddress = accounts[0];
                signer = await provider.getSigner();
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                updateUIConnected();
                loadData();
            }
        } catch (err) {
            console.error("Auto-connect failed", err);
        }
    } else {
        console.error("MetaMask not found!");
        if (window.location.protocol === 'file:') {
            alert("MetaMask does not work when opening files directly (file://). Please use a local server (http://localhost).");
        } else {
            alert("Please install MetaMask! (window.ethereum not found)");
        }
    }
}

// Connect Wallet
connectBtn.addEventListener('click', async () => {
    if (!provider) return;
    try {
        const accounts = await provider.send("eth_requestAccounts", []);
        currentAddress = accounts[0];
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        updateUIConnected();
        loadData();
    } catch (err) {
        console.error(err);
        alert("Failed to connect wallet.");
    }
});

function updateUIConnected() {
    connectBtn.textContent = "Connected";
    connectBtn.disabled = true;
    userStatus.textContent = `${currentAddress.substring(0, 6)}...${currentAddress.substring(38)}`;
}

// Load Data
async function loadData() {
    await loadIcons();
    await loadNotes();
}

// Load Icons
async function loadIcons() {
    iconGrid.innerHTML = "Loading icons...";
    try {
        const count = await contract.iconCount();
        iconGrid.innerHTML = "";

        if (count == 0n) {
            iconGrid.innerHTML = "<p>No icons available in the shop yet.</p>";
            return;
        }

        for (let i = 0; i < count; i++) {
            const icon = await contract.getIcon(i);
            // icon struct: {id, iconType, price, available}
            if (!icon.available) continue;

            const card = document.createElement('div');
            card.className = 'card';

            const iconTypeName = IconTypes[Number(icon.iconType)] || "Unknown";
            // Prettify name for display by adding spaces before capitals
            const displayName = iconTypeName.replace(/([A-Z])/g, ' $1').trim();
            const priceEth = ethers.formatEther(icon.price);

            card.innerHTML = `
                <img src="images/${iconTypeName}.png" alt="${displayName}" class="icon-img">
                <h3>${displayName}</h3>
                <p>Price: ${priceEth} ETH</p>
                <input type="text" id="recipient-${i}" placeholder="Recipient 0x..." style="margin-top:0.5rem">
                <button class="btn" onclick="buyIcon(${i})">Send Gift</button>
            `;
            iconGrid.appendChild(card);
        }
    } catch (err) {
        console.error("Error loading icons:", err);
        iconGrid.innerHTML = "<p>Error loading icons. Make sure contract is deployed.</p>";
    }
}

// Buy Icon (Global function for onclick)
window.buyIcon = async (id) => {
    const recipientInput = document.getElementById(`recipient-${id}`);
    const recipient = recipientInput.value;

    if (!ethers.isAddress(recipient)) {
        alert("Invalid recipient address!");
        return;
    }

    try {
        const icon = await contract.getIcon(id);
        const tx = await contract.buyAndSendIcon(id, recipient, { value: icon.price });
        alert("Transaction sent! Waiting for confirmation...");
        await tx.wait();
        alert("Gift sent successfully!");
    } catch (err) {
        console.error(err);
        alert("Transaction failed: " + (err.reason || err.message));
    }
};

// Send Note
document.getElementById('sendNoteBtn').addEventListener('click', async () => {
    const recipient = document.getElementById('noteRecipient').value;
    const content = document.getElementById('noteContent').value;

    if (!ethers.isAddress(recipient)) {
        alert("Invalid recipient address!");
        return;
    }
    if (!content) {
        alert("Please write a message!");
        return;
    }

    const encrypted = content;

    try {
        const tx = await contract.sendEncryptedNote(recipient, encrypted);
        alert("Sending note...");
        await tx.wait();
        alert("Note sent successfully!");
        document.getElementById('noteContent').value = "";
    } catch (err) {
        console.error(err);
        alert("Failed to send note: " + (err.reason || err.message));
    }
});

// Load Notes
async function loadNotes() {
    notesList.innerHTML = "Loading your notes...";
    try {
        const noteCount = await contract.noteCount();
        notesList.innerHTML = "";
        let found = false;

        // Loop backwards to show newest first
        for (let i = Number(noteCount) - 1; i >= 0; i--) {
            try {
                const note = await contract.getNote(i);
                if (note.recipient.toLowerCase() === currentAddress.toLowerCase()) {
                    found = true;
                    const div = document.createElement('div');
                    div.className = 'note-item';

                    let contentDisplay = "Encrypted Message";

                    if (note.isRead) {
                        contentDisplay = `Decrypted: ${note.encryptedContent}`;
                    } else {
                        contentDisplay = `<button class="btn" style="padding:0.5rem" onclick="readNote(${i})">Decrypt & Read</button>`;
                    }

                    div.innerHTML = `
                        <strong>From:</strong> ${note.sender.substring(0, 6)}... <br>
                        <strong>Message:</strong> ${contentDisplay}
                    `;
                    notesList.appendChild(div);
                }
            } catch (e) { console.log("Error fetching note", i, e); }
        }

        if (!found) notesList.innerHTML = "<p>No notes found for you.</p>";

    } catch (err) {
        console.error(err);
        notesList.innerHTML = "<p>Error loading notes.</p>";
    }
}

window.readNote = async (id) => {
    try {
        const tx = await contract.readEncryptedNote(id);
        alert("Marking as read... decrypting...");
        await tx.wait();
        loadNotes();
    } catch (err) {
        console.error(err);
        alert("Error reading note");
    }

}

// Wait for window load to ensure MetaMask has injected window.ethereum
window.addEventListener('load', init);
