// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract SecureNotes {

    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    /* Encripted notes */

    struct Note {
        address sender;
        address recipient;
        string encryptedContent;
        bool isRead;
    }

    mapping(uint256 => Note) private notes;
    uint256 public noteCount;

    event NoteSent(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient
    );

    event NoteRead(uint256 indexed id, address indexed reader);

    function sendEncryptedNote(
        address _recipient,
        string memory _encryptedContent
    ) external {
        require(_recipient != address(0), "Invalid reciever");
        require(bytes(_encryptedContent).length > 0, "Empty content");

        notes[noteCount] = Note({
            sender: msg.sender,
            recipient: _recipient,
            encryptedContent: _encryptedContent,
            isRead: false
        });

        emit NoteSent(noteCount, msg.sender, _recipient);
        noteCount++;
    }

    function readEncryptedNote(uint256 _id)
        external
        returns (string memory)
    {
        Note storage note = notes[_id];

        require(msg.sender == note.recipient, "Not authorized");
        require(!note.isRead, "Note already read");

        note.isRead = true;
        emit NoteRead(_id, msg.sender);

        return note.encryptedContent;
    }

    /* Icons to buy */

    enum IconType {
        BuonCompleanno,
        AuguriM,
        AuguriF,
        Auguri,
        BuonNatale
    }

    struct Icon {
        uint256 id;
        IconType iconType;
        uint256 price;
        bool available;
    }

    mapping(uint256 => Icon) private icons;
    uint256 public iconCount;

    event IconAdded(uint256 indexed id, IconType iconType, uint256 price);

    event IconPurchased(
        uint256 indexed id,
        IconType iconType,
        address indexed buyer,
        address indexed recipient,
        uint256 price
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

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

    function updateIconPrice(uint256 _id, uint256 _newPrice)
        external
        onlyOwner
    {
        require(_newPrice > 0, "Invalid price");
        icons[_id].price = _newPrice;
    }

    function setIconAvailability(uint256 _id, bool _available)
        external
        onlyOwner
    {
        icons[_id].available = _available;
    }

    function buyAndSendIcon(uint256 _id, address _recipient)
        external
        payable
    {
        Icon storage icon = icons[_id];

        require(icon.available, "Icon not available");
        require(msg.value >= icon.price, "Insufficient payment");
        require(_recipient != address(0), "Invalid recipient");

        uint256 price = icon.price;

        (bool sent, ) = payable(owner).call{value: price}("");
        require(sent, "Payment failed");

        if (msg.value > price) {
            (bool refundSent, ) = payable(msg.sender).call{
                value: msg.value - price
            }("");
            require(refundSent, "Refund failed");
        }

        emit IconPurchased(
            _id,
            icon.iconType,
            msg.sender,
            _recipient,
            price
        );
    }

    /* View functions */

    function getNote(uint256 _id)
        external
        view
        returns (Note memory)
    {
        return notes[_id];
    }

    function getIcon(uint256 _id)
        external
        view
        returns (Icon memory)
    {
        return icons[_id];
    }

    receive() external payable {
        revert("Direct payments not allowed");
    }
}
