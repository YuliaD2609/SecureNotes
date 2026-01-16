const CONTRACT_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"; // Localhost deployment

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
// State
let loadedIconsData = [];
let currentSelectedIconId = null;

// UI Elements (added)
const iconGrid = document.getElementById('iconGrid');
const myCardsGrid = document.getElementById('myCardsGrid');
const notesList = document.getElementById('notesList');
const iconDetailView = document.getElementById('iconDetailView');
const detailImage = document.getElementById('detailImage');
const detailName = document.getElementById('detailName');
const detailPrice = document.getElementById('detailPrice');
const detailRecipient = document.getElementById('detailRecipient');
const detailBuyBtn = document.getElementById('detailBuyBtn');
const detailBackBtn = document.getElementById('detailBackBtn');

// Back Button Handler
detailBackBtn.addEventListener('click', closeDetailView);

// Buy Button Handler (Detail View)
detailBuyBtn.addEventListener('click', async () => {
    if (currentSelectedIconId === null) return;
    await buyIcon(currentSelectedIconId);
});

// Connection State
let isConnected = false;

// Initialize
async function init() {
    console.log("Initializing...", "window.ethereum type:", typeof window.ethereum);
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        // Auto-connect check
        try {
            const accounts = await provider.send("eth_accounts", []);
            if (accounts.length > 0) {
                await connectWallet();
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

// Connect / Disconnect Handler
connectBtn.addEventListener('click', async () => {
    if (isConnected) {
        disconnectWallet();
    } else {
        await connectWallet();
    }
});

async function connectWallet() {
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
}

function disconnectWallet() {
    isConnected = false;
    currentAddress = null;
    signer = null;
    contract = null;

    // Reset UI
    connectBtn.textContent = "Connect Wallet";
    connectBtn.classList.remove('btn-secondary'); // Optional styling
    userStatus.textContent = "Not Connected";

    // Clear Data Displays
    iconGrid.innerHTML = '<div class="card">Connect your wallet to see the icons.</div>';
    myCardsGrid.innerHTML = '<div class="card">Connect your wallet to see your cards.</div>';
    notesList.innerHTML = '<p>Connect your wallet to see your recieved notes.</p>';

    // Reset Views in case detail view is open
    closeDetailView();
}

function updateUIConnected() {
    isConnected = true;
    connectBtn.textContent = "Disconnect";
    connectBtn.disabled = false; // Enable to allow disconnect
    userStatus.textContent = `${currentAddress.substring(0, 6)}...${currentAddress.substring(38)}`;
}

// Load Data
async function loadData() {
    await loadIcons();
    await loadMyCards();
    await loadNotes();
}

// Load Icons
async function loadIcons() {
    iconGrid.innerHTML = "Loading icons...";
    loadedIconsData = []; // Reset state
    try {
        const count = await contract.iconCount();
        iconGrid.innerHTML = "";

        if (count == 0n) {
            iconGrid.innerHTML = "<p>No icons available in the shop yet.</p>";
            return;
        }

        for (let i = 0; i < count; i++) {
            const icon = await contract.getIcon(i);
            if (!icon.available) continue;

            // Store data for detail view
            loadedIconsData[i] = {
                id: i,
                iconType: Number(icon.iconType),
                price: icon.price
            };

            const card = document.createElement('div');
            card.className = 'card';

            // For simple card: just image and a "View" button or just clickable area
            const iconTypeName = IconTypes[Number(icon.iconType)] || "Unknown";
            const displayName = iconTypeName.replace(/([A-Z])/g, ' $1').trim();

            card.innerHTML = `
                <img src="images/${iconTypeName}.png" alt="${displayName}" class="icon-img" onclick="openDetailIcon(${i})">
                <h3>${displayName}</h3>
                <button class="btn" style="margin-top:0.5rem" onclick="openDetailIcon(${i})">Buy</button>
            `;
            iconGrid.appendChild(card);
        }
    } catch (err) {
        console.error("Error loading icons:", err);
        iconGrid.innerHTML = "<p>Error loading icons. Make sure contract is deployed.</p>";
    }
}

// Load My Cards
async function loadMyCards() {
    myCardsGrid.innerHTML = "Loading cards...";
    try {
        const receivedIcons = await contract.getMyReceivedIcons();
        myCardsGrid.innerHTML = "";

        if (receivedIcons.length === 0) {
            myCardsGrid.innerHTML = "<p>You haven't received any cards yet.</p>";
            return;
        }

        for (let i = 0; i < receivedIcons.length; i++) {
            const item = receivedIcons[i];
            const iconId = item.iconId;
            const sender = item.sender;

            // We need to fetch icon details (like type) to display image
            const iconDetails = await contract.getIcon(iconId);
            const iconTypeName = IconTypes[Number(iconDetails.iconType)] || "Unknown";
            const displayName = iconTypeName.replace(/([A-Z])/g, ' $1').trim();

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="images/${iconTypeName}.png" alt="${displayName}" class="icon-img">
                <h3>${displayName}</h3>
                <p style="font-size: 0.9rem; color: #666;">From: ${sender.substring(0, 6)}...${sender.substring(38)}</p>
            `;
            myCardsGrid.appendChild(card);
        }

    } catch (err) {
        console.error("Error loading my cards:", err);
        myCardsGrid.innerHTML = "<p>Error loading your cards.</p>";
    }
}

// Open Detail View
window.openDetailIcon = (id) => {
    const iconData = loadedIconsData[id];
    if (!iconData) return;

    currentSelectedIconId = id;

    // Populate Detail View
    const iconTypeName = IconTypes[iconData.iconType] || "Unknown";
    const displayName = iconTypeName.replace(/([A-Z])/g, ' $1').trim();
    const priceEth = ethers.formatEther(iconData.price);

    detailImage.src = `images/${iconTypeName}.png`;
    detailName.textContent = displayName;
    detailPrice.textContent = `${priceEth} ETH`;
    detailRecipient.value = ""; // Clear previous input

    // Show/Hide Views
    iconGrid.classList.add('hidden');
    iconDetailView.classList.remove('hidden');
}

// Close Detail View
function closeDetailView() {
    iconDetailView.classList.add('hidden');
    iconGrid.classList.remove('hidden');
    currentSelectedIconId = null;
}

// Buy Icon (Internal function)
async function buyIcon(id) {
    const recipient = detailRecipient.value;

    if (!ethers.isAddress(recipient)) {
        alert("Invalid recipient address!");
        return;
    }

    try {
        const iconData = loadedIconsData[id];
        const tx = await contract.buyAndSendIcon(id, recipient, { value: iconData.price });
        alert("Transaction sent! Waiting for confirmation...");
        await tx.wait();
        alert("Gift sent successfully!");
        closeDetailView();
    } catch (err) {
        console.error(err);
        alert("Transaction failed: " + (err.reason || err.message));
    }
};

// Global for backward compatibility / console debugging
window.buyIcon = buyIcon;

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
    notesList.innerHTML = "Loading notes...";
    try {
        const count = await contract.noteCount();
        notesList.innerHTML = "";

        let hasNotes = false;

        for (let i = 0; i < count; i++) {
            const note = await contract.getNote(i);
            // note: {sender, recipient, encryptedContent, isRead, timestamp, isDeleted}

            // Should be visible if I am recipient
            if (note.recipient.toLowerCase() === currentAddress.toLowerCase()) {
                if (note.isDeleted) continue; // Skip deleted notes

                hasNotes = true;
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';

                const timestampDate = new Date(Number(note.timestamp) * 1000);
                const dateString = timestampDate.toLocaleDateString() + " " + timestampDate.toLocaleTimeString();

                noteElement.innerHTML = `
                    <div class="note-header">
                        <span>From: ${note.sender.substring(0, 6)}...${note.sender.substring(38)}</span>
                        <div class="note-timestamp" title="Received at">
                            🕒 ${dateString}
                        </div>
                    </div>
                    ${note.isRead
                        ? `<p style="color:#666; font-style:italic">Message read (content hidden)</p>`
                        : `<p id="note-content-${i}" style="font-weight:bold">Encrypted Message</p>`
                    }
                    <div class="note-actions">
                        ${!note.isRead ? `<button class="btn" onclick="readNote(${i})">Decrypt & Read</button>` : ''}
                        <button class="btn btn-danger" onclick="deleteNote(${i})">Delete</button>
                    </div>
                `;
                notesList.appendChild(noteElement);
            }
        }

        if (!hasNotes) {
            notesList.innerHTML = "<p>You haven't received any notes yet.</p>";
        }

    } catch (err) {
        console.error("Error loading notes:", err);
        notesList.innerHTML = "<p>Error loading notes.</p>";
    }
}

// Read Note
window.readNote = async (id) => {
    try {
        const note = await contract.getNote(id);
        const decryptedContent = note.encryptedContent;

        const contentElement = document.getElementById(`note-content-${id}`);
        contentElement.textContent = "Decrypting..."; // Feedback

        // Trigger transaction to mark as read
        const tx = await contract.readEncryptedNote(id);
        contentElement.textContent = "Processing...";
        await tx.wait();

        // Show content
        contentElement.textContent = decryptedContent;
        contentElement.style.color = "var(--primary)";

        // Optional: Refresh list to show "Message read" status if page reloads, 
        // but here we keep the content visible as requested ("view once" implies they see it now).
    } catch (err) {
        console.error(err);
        alert("Failed to read note: " + (err.reason || err.message));
        // Reset text if failed
        const contentElement = document.getElementById(`note-content-${id}`);
        if (contentElement) contentElement.textContent = "Encrypted Message";
    }
};

// Delete Note
window.deleteNote = async (id) => {
    if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) return;

    try {
        const tx = await contract.deleteNote(id);
        alert("Deleting note... Waiting for confirmation.");
        await tx.wait();

        loadNotes(); // Refresh list
        alert("Note deleted.");
    } catch (err) {
        console.error(err);
        alert("Failed to delete note: " + (err.reason || err.message));
    }
};

// Wait for window load to ensure MetaMask has injected window.ethereum
window.addEventListener('load', init);
