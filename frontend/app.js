// Address of the deployed smart contract (Localhost)
let CONTRACT_ADDRESS;

// Global variables for Ethers.js objects
let provider;       // Connection to the Ethereum network
let signer;         // The account executing transactions
let contract;       // The contract instance
let currentAddress; // The user's wallet address

// List of available Icon types matching the contract Enum
const IconTypes = [
    "HappyBirthday",
    "Congratulations",
    "MerryChristmas",
    "Graduation"
];

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const userStatus = document.getElementById('userStatus');
// State variables
let loadedIconsData = [];       // Cache for loaded icons
let currentSelectedIconId = null; // ID of the icon currently being viewed in detail

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

// Close Detail View Button
detailBackBtn.addEventListener('click', closeDetailView);

// Buy Button in Detail View
detailBuyBtn.addEventListener('click', async () => {
    if (currentSelectedIconId === null) return;
    await buyIcon(currentSelectedIconId);
});

// Connection State Flag
let isConnected = false;

// Initialize the application
async function init() { // check if the user has MetaMask installed
    console.log("Initializing...", "window.ethereum type:", typeof window.ethereum);

    try { // load the contract address from the JSON file to know where it is on the blockchain
        const response = await fetch('./src/contract-address.json');
        const data = await response.json();
        CONTRACT_ADDRESS = data.SecureNotes;
        console.log("Contract Address loaded:", CONTRACT_ADDRESS);
    } catch (err) {
        console.error("Could not load contract address", err);
        alert("Error loading contract configuration.");
        return;
    }

    // Check if MetaMask is installed
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum); // connect to the blockchain

        // Handle account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log("Account changed:", accounts);
            disconnectWallet();
            // User must manually reconnect
        });

        /* Auto-connect disabled
        // Check if already authorized (auto-connect)
        try {
            const accounts = await provider.send("eth_accounts", []); // get the user's wallet address
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (err) {
            console.error("Auto-connect failed", err);
        }
        */
    } else {
        console.error("MetaMask not found!");
        // Specific error for file:// protocol
        if (window.location.protocol === 'file:') {
            alert("MetaMask does not work when opening files directly (file://). Please use a local server (http://localhost).");
        } else {
            alert("Please install MetaMask! (window.ethereum not found)");
        }
    }
}

// Connect/Disconnect button
connectBtn.addEventListener('click', async () => {
    if (isConnected) {
        disconnectWallet();
    } else {
        await connectWallet();
    }
});


// Connect to MetaMask wallet
async function connectWallet() {
    if (!provider) return;
    try {
        // Request access to accounts
        const accounts = await provider.send("eth_requestAccounts", []);
        currentAddress = accounts[0];
        signer = await provider.getSigner(); // get the user's wallet address
        // Initialize contract instance
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        updateUIConnected();
        loadData();
    } catch (err) {
        console.error(err);
        alert("Failed to connect wallet.");
    }
}

// Disconnect wallet (reset app state)
function disconnectWallet() {
    isConnected = false;
    currentAddress = null;
    signer = null;
    contract = null;

    connectBtn.textContent = "Connect Wallet";
    connectBtn.classList.remove('btn-secondary');
    userStatus.textContent = "Not Connected";

    const sendBtn = document.getElementById('sendNoteBtn');
    if (sendBtn) {
        sendBtn.textContent = "Connect your wallet to send a note";
        sendBtn.classList.remove('btn-warning');
        sendBtn.onclick = null;
    }

    iconGrid.innerHTML = '<div class="card">Connect your wallet to see the icons.</div>';
    myCardsGrid.innerHTML = '<div class="card">Connect your wallet to see your cards.</div>';
    notesList.innerHTML = '<p>Connect your wallet to see your recieved notes.</p>';

    // Close detail view if open
    closeDetailView();

    // Clear Form Inputs
    const recipientInput = document.getElementById('noteRecipient');
    const contentInput = document.getElementById('noteContent');
    if (recipientInput) recipientInput.value = "";
    if (contentInput) contentInput.value = "";
}

// Update UI elements when connected
function updateUIConnected() {
    isConnected = true;
    connectBtn.textContent = "Disconnect";
    connectBtn.disabled = false;
    // Display truncated address
    userStatus.textContent = `${currentAddress.substring(0, 6)}...${currentAddress.substring(38)}`;
}

// Load all application data
async function loadData() {
    await loadIcons();
    await loadMyCards();
    await loadNotes();
    await checkUserStatus();
}

// Check if user has registered their public key
async function checkUserStatus() {
    const sendBtn = document.getElementById('sendNoteBtn');
    try {
        const key = await contract.encryptionKeys(currentAddress);
        if (!key || key.length === 0) {
            // User needs to register first
            sendBtn.textContent = "Enable Secure Notes";
            sendBtn.classList.add('btn-warning');
            sendBtn.onclick = registerPublicKey; // Override click handler
        } else {
            // User is registered, normal send
            sendBtn.textContent = "Send Encrypted Note";
            sendBtn.classList.remove('btn-warning');
            sendBtn.onclick = sendEncryptedNote; // Restore send handler
        }
    } catch (err) {
        console.error("Error checking public key:", err);
    }
}

// Register Public Key
async function registerPublicKey() {
    try {
        // Request encryption public key from MetaMask
        const key = await window.ethereum.request({
            method: 'eth_getEncryptionPublicKey',
            params: [currentAddress],
        });

        // Register on chain
        const tx = await contract.registerPublicKey(key);
        const sendBtn = document.getElementById('sendNoteBtn');
        if (sendBtn) sendBtn.textContent = "Registering...";

        await tx.wait();

        alert("Secure Notes Enabled! You can now send and receive encrypted messages.");
        // Refresh status
        await checkUserStatus();
    } catch (err) {
        console.error(err);
        alert("Registration failed: " + (err.message || err));
    }
}

// Fetch and display available icons from the shop
async function loadIcons() {
    iconGrid.innerHTML = "Loading icons...";
    loadedIconsData = []; // Reset cache
    try {
        const count = await contract.iconCount(); // Icons on the contract
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

            // Format display name
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

// Load cards received by the current user
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

            // Fetch specific icon details for display
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

// Open the detail view for a specific icon
window.openDetailIcon = (id) => {
    const iconData = loadedIconsData[id];
    if (!iconData) return;

    currentSelectedIconId = id;

    // Populate detail view
    const iconTypeName = IconTypes[iconData.iconType] || "Unknown";
    const displayName = iconTypeName.replace(/([A-Z])/g, ' $1').trim();
    const priceEth = ethers.formatEther(iconData.price);

    detailImage.src = `images/${iconTypeName}.png`;
    detailName.textContent = displayName;
    detailPrice.textContent = `${priceEth} ETH`;
    detailRecipient.value = ""; // Clear previous input

    // Show view, hide grid
    iconGrid.classList.add('hidden');
    iconDetailView.classList.remove('hidden');
}

// Close the detail view and return to the grid
function closeDetailView() {
    iconDetailView.classList.add('hidden');
    iconGrid.classList.remove('hidden');
    currentSelectedIconId = null;
}

// Execute purchase of an icon
async function buyIcon(id) {
    const recipient = detailRecipient.value;

    if (!ethers.isAddress(recipient)) {
        alert("Invalid recipient address!");
        return;
    }

    try {
        const iconData = loadedIconsData[id];
        // Call smart contract function to buy and send
        const tx = await contract.buyAndSendIcon(id, recipient, { value: iconData.price });
        alert("Transaction sent! Waiting for confirmation...");
        await tx.wait(); // Wait for block confirmation
        alert("Gift sent successfully!");
        closeDetailView();
        // Reload data to reflect changes (though shop doesn't change, balances do)
        loadData();
    } catch (err) {
        console.error(err);
        alert("Transaction failed: " + (err.reason || err.message));
    }
};

// Global for backward compatibility / console debugging
window.buyIcon = buyIcon;

// Function for Sending Note
async function sendEncryptedNote() {
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

    // Get Recipient's Public Key from Contract
    let recipientPublicKey;
    try {
        recipientPublicKey = await contract.encryptionKeys(recipient);
    } catch (err) {
        console.error(err);
        alert("Error fetching recipient key");
        return;
    }

    if (!recipientPublicKey || recipientPublicKey.length === 0) {
        alert("This user has not enabled Secure Notes (Public Key not registered). Cannot send encrypted message.");
        return;
    }

    // Encrypt Content (Off-Chain)
    let encryptedString;
    try {
        /*
          MetaMask "eth_decrypt" expects an object with:
          {
            version: 'x25519-xsalsa20-poly1305',
            nonce: 'base64...',
            ephemPublicKey: 'base64...',
            ciphertext: 'base64...'
          }
          We must replicate this structure using TweetNaCl.
        */

        // Helper to encode/decode
        const checkUtil = () => {
            if (typeof nacl === 'undefined' || typeof nacl.util === 'undefined') {
                throw new Error("TweetNaCl library not loaded!");
            }
        };
        checkUtil();

        // Decode the base64 public key from MetaMask
        const receiverPublicKeyUint8 = nacl.util.decodeBase64(recipientPublicKey);

        // Generate ephemeral keypair
        const ephemeralKeyPair = nacl.box.keyPair();

        // Generate random nonce (24 bytes)
        const nonce = nacl.randomBytes(nacl.box.nonceLength);

        // Encode message to UTF-8
        const messageUtf8 = nacl.util.decodeUTF8(content);

        // Encrypt
        const encryptedMessage = nacl.box(
            messageUtf8,
            nonce,
            receiverPublicKeyUint8,
            ephemeralKeyPair.secretKey
        );

        // Construct the structured object expected by MetaMask
        const encryptedObject = {
            version: 'x25519-xsalsa20-poly1305',
            nonce: nacl.util.encodeBase64(nonce),
            ephemPublicKey: nacl.util.encodeBase64(ephemeralKeyPair.publicKey),
            ciphertext: nacl.util.encodeBase64(encryptedMessage)
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(encryptedObject);

        // Hex-encode the string for MetaMask compatibility (eth_decrypt expects hex)
        // We use the Ethers.js utility functions available globally
        // ethers.toUtf8Bytes convert string to Uint8Array
        // ethers.hexlify converts Uint8Array to hex string (0x...)
        encryptedString = ethers.hexlify(ethers.toUtf8Bytes(jsonString));

    } catch (err) {
        console.error("Encryption failed:", err);
        alert("Encryption failed: " + err.message);
        return;
    }

    try { // Send encrypted note to contract
        const tx = await contract.sendEncryptedNote(recipient, encryptedString);
        alert("Sending note...");
        await tx.wait();
        alert("Note sent successfully!");
        // Clear inputs
        document.getElementById('noteContent').value = "";
        // Refresh list to show sent notes if we were tracking them (function only loads received)
    } catch (err) {
        console.error(err);
        alert("Failed to send note: " + (err.reason || err.message));
    }
}

// Load notes received
async function loadNotes() {
    notesList.innerHTML = "Loading notes...";
    try {
        const count = await contract.noteCount();
        notesList.innerHTML = "";

        let hasNotes = false;

        for (let i = 0; i < count; i++) {
            const note = await contract.getNote(i);
            // note object contains: sender, recipient, encryptedContent, isRead, timestamp, isDeleted

            // Only show notes sent to the current user
            if (note.recipient.toLowerCase() === currentAddress.toLowerCase()) {
                if (note.isDeleted) continue; // Skip deleted notes

                hasNotes = true;
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';

                // Format timestamp
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
                        ${!note.isRead ? `<button class="btn" onclick="readNote(${i})" id="decrypt-btn-${i}">Decrypt & Read</button>` : ''}
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

// Decrypt and Read a Note
window.readNote = async (id) => {
    try {
        // Fetch the note content off-chain to see the data
        const note = await contract.getNote(id);
        const encryptedContent = note.encryptedContent;

        const contentElement = document.getElementById(`note-content-${id}`);
        contentElement.textContent = "Decrypting (Check MetaMask)..."; // Feedback

        // Decrypt (Off-Chain) using MetaMask
        let decryptedMessage;
        try {
            // MetaMask eth_decrypt expects the first parameter to be the HEX-encoded string OR the JSON string.
            // If encryptedContent is already a JSON string (which it is from our send function), we pass it directly.

            decryptedMessage = await window.ethereum.request({
                method: 'eth_decrypt',
                params: [encryptedContent, currentAddress],
            });
        } catch (decryptErr) {
            throw new Error("Decryption denied or failed: " + decryptErr.message);
        }

        // Trigger transaction to mark as read on-chain
        // After decrypting ensuring user actually read it before burning the "unread" status
        const tx = await contract.readEncryptedNote(id);
        contentElement.textContent = "Marking as read...";
        await tx.wait();

        // Display the content
        contentElement.textContent = decryptedMessage;
        contentElement.style.color = "#1a237e"; // Dark blue text

        // Remove the decrypt button
        const btn = document.getElementById(`decrypt-btn-${id}`);
        if (btn) btn.remove();
    } catch (err) {
        console.error(err);
        alert("Failed to read note: " + (err.reason || err.message));
        // Reset text if failed
        const contentElement = document.getElementById(`note-content-${id}`);
        if (contentElement) contentElement.textContent = "Encrypted Message";
    }
};

// Delete a Note
window.deleteNote = async (id) => {
    if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) return;

    try {
        const tx = await contract.deleteNote(id);
        alert("Deleting note... Waiting for confirmation.");
        await tx.wait();

        loadNotes(); // Refresh list to remove the deleted note
        alert("Note deleted.");
    } catch (err) {
        console.error(err);
        alert("Failed to delete note: " + (err.reason || err.message));
    }
};

// Wait for window load to ensure MetaMask has injected window.ethereum
window.addEventListener('load', init);
