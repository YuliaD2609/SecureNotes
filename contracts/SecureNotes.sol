// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Smart contract for the SecureNotes application
contract SecureNotes {

    // The address of the contract owner (admin)
    address public immutable owner;

    // Constructor sets the deployer as the owner
    constructor() {
        owner = msg.sender;
    }

    // Struct to represent a secure note
    struct Note {
        address sender;             // Who sent the note
        address recipient;          // Who receives the note
        string encryptedContent;    // The encrypted message text
        bool isRead;                // Flag to check if it has been read
        uint256 timestamp;          // Time when the note was created
        bool isDeleted;             // Flag to mark note as deleted
    }

    // Mapping to store notes by a unique ID
    mapping(uint256 => Note) private notes;
    // Counter to track total number of notes
    uint256 public noteCount;

    // Mapping to store users' encryption public keys
    mapping(address => string) public encryptionKeys;

    // Event emitted when a note is sent
    event NoteSent(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 timestamp
    );
    
    // Event emitted when a user registers their public key
    event PublicKeyRegistered(address indexed user, string publicKey);

    // Event emitted when a note is marked as read
    event NoteRead(uint256 indexed id, address indexed reader);
    // Event emitted when a note is deleted
    event NoteDeleted(uint256 indexed id, address indexed deleter);

    // Function to register the caller's encryption public key
    function registerPublicKey(string memory _publicKey) external {
        require(bytes(_publicKey).length > 0, "Key cannot be empty");
        encryptionKeys[msg.sender] = _publicKey;
        emit PublicKeyRegistered(msg.sender, _publicKey);
    }

    // Function to send an encrypted note to a recipient
    function sendEncryptedNote(
        address _recipient,
        string memory _encryptedContent
    ) external {
        require(_recipient != address(0), "Invalid reciever");
        require(bytes(_encryptedContent).length > 0, "Empty content");

        // Create and store the new note
        notes[noteCount] = Note({
            sender: msg.sender,
            recipient: _recipient,
            encryptedContent: _encryptedContent,
            isRead: false,
            timestamp: block.timestamp,
            isDeleted: false
        });

        emit NoteSent(noteCount, msg.sender, _recipient, block.timestamp);
        noteCount++; // Increment the ID counter
    }

    // Function to read an encrypted note
    function readEncryptedNote(uint256 _id)
        external
        returns (string memory)
    {
        Note storage note = notes[_id];

        // Security checks
        require(msg.sender == note.recipient, "Not authorized");
        require(!note.isDeleted, "Note deleted");
        require(!note.isRead, "Note already read");

        // Mark as read
        note.isRead = true;
        emit NoteRead(_id, msg.sender);

        return note.encryptedContent;
    }

    // Function to delete a note
    function deleteNote(uint256 _id) external {
        Note storage note = notes[_id];
        require(msg.sender == note.recipient, "Not authorized");
        require(!note.isDeleted, "Note already deleted");

        note.isDeleted = true;
        note.encryptedContent = ""; // Clear content to save space/security
        emit NoteDeleted(_id, msg.sender);
    }

    // Enum defining the available icon types
    enum IconType {
        HappyBirthday,
        Congratulations,
        MerryChristmas,
        Graduation
    }

    // Struct to represent an icon in the shop
    struct Icon {
        uint256 id;
        IconType iconType;
        uint256 price;
        bool available;
    }

    // Mapping to store icons by ID
    mapping(uint256 => Icon) private icons;
    // Counter for total icons
    uint256 public iconCount;

    // Struct to track icons received by a user
    struct ReceivedIcon {
        uint256 iconId;
        address sender;
    }
    // Mapping from user address to their list of received icons
    mapping(address => ReceivedIcon[]) private receivedIcons;

    // Event emitted when a new icon is added to the shop
    event IconAdded(uint256 indexed id, IconType iconType, uint256 price);

    // Event emitted when an icon is purchased
    event IconPurchased(
        uint256 indexed id,
        IconType iconType,
        address indexed buyer,
        address indexed recipient,
        uint256 price
    );

    // Modifier to restrict functions to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Function to add a new icon to the shop
    function addIcon(IconType _type, uint256 _price)
        external
        onlyOwner
    {
        require(_price > 0, "Invalid price");

        icons[iconCount] = Icon({
            id: iconCount,
            iconType: _type,
            price: _price,
            available: true
        });

        emit IconAdded(iconCount, _type, _price);
        iconCount++;
    }

    // Function to update an icon's price
    function updateIconPrice(uint256 _id, uint256 _newPrice)
        external
        onlyOwner
    {
        require(_newPrice > 0, "Invalid price");
        icons[_id].price = _newPrice;
    }

    // Function to set if an icon is available for purchase
    function setIconAvailability(uint256 _id, bool _available)
        external
        onlyOwner
    {
        icons[_id].available = _available;
    }

    // Function to buy an icon and send it to a friend
    function buyAndSendIcon(uint256 _id, address _recipient)
        external
        payable
    {
        Icon storage icon = icons[_id];

        // Validation checks
        require(icon.available, "Icon not available");
        require(msg.value >= icon.price, "Insufficient payment");
        require(_recipient != address(0), "Invalid recipient");

        uint256 price = icon.price;

        // Transfer payment to the owner
        (bool sent, ) = payable(owner).call{value: price}("");
        require(sent, "Payment failed");

        // Refund any excess payment to the buyer
        if (msg.value > price) {
            (bool refundSent, ) = payable(msg.sender).call{
                value: msg.value - price
            }("");
            require(refundSent, "Refund failed");
        }

        // Record the transaction for the recipient
        receivedIcons[_recipient].push(ReceivedIcon({
            iconId: _id,
            sender: msg.sender
        }));

        emit IconPurchased(
            _id,
            icon.iconType,
            msg.sender,
            _recipient,
            price
        );
    }

    // Get details of a specific note
    function getNote(uint256 _id)
        external
        view
        returns (Note memory)
    {
        return notes[_id];
    }

    // Get details of a specific icon
    function getIcon(uint256 _id)
        external
        view
        returns (Icon memory)
    {
        return icons[_id];
    }

    // Get all icons received by the caller
    function getMyReceivedIcons() external view returns (ReceivedIcon[] memory) {
        return receivedIcons[msg.sender];
    }

    // Fallback function to reject direct payments
    receive() external payable {
        revert("Direct payments not allowed");
    }
}
