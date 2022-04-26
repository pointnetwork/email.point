// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @dev Implementation of email.point smart contract.
 */

contract PointEmail is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using Counters for Counters.Counter;
    Counters.Counter internal _emailIds;

    struct Email {
        uint256 id;
        address from;
        address to;
        uint256 createdAt;
    }

    struct EmailUserMetaData {
        bytes32 encryptedMessageId;
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    struct EmailWithUserMetaData {
        uint256 id;
        address from;
        address to;
        uint256 createdAt;
        bytes32 encryptedMessageId;
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    // Email mappings
    mapping(bytes32 => Email) public encryptedMessageIdToEmail;
    mapping(address => Email[]) public toEmails;
    mapping(address => Email[]) public fromEmails;

    mapping(uint256 => mapping(address => EmailUserMetaData))
        public emailUserMetadata;

    event EmailSent(
        uint256 id,
        address indexed from,
        address indexed to,
        uint256 indexed timestamp
    );

    event EmailDeleted(
        address indexed user,
        bytes32 indexed id,
        bool deleted,
        uint256 timestamp
    );

    event EmailMarkedAsImportant(
        address indexed user,
        bytes32 indexed id,
        bool important,
        uint256 timestamp
    );

    event EmailRead(
        address indexed user,
        bytes32 indexed id,
        bool read,
        uint256 timestamp
    );

    modifier onlySenderOrRecipient(bytes32 _encryptedMessageId) {
        require(
            encryptedMessageIdToEmail[_encryptedMessageId].from == msg.sender ||
                encryptedMessageIdToEmail[_encryptedMessageId].to == msg.sender,
            "Permission Denied"
        );
        _;
    }

    modifier onlyRecipient(bytes32 _encryptedMessageId) {
        require(
            encryptedMessageIdToEmail[_encryptedMessageId].to == msg.sender,
            "Only Recipient"
        );
        _;
    }

    /**
     * @dev Send a new email to a recipient
     */
    function send(
        address to,
        bytes32 fromEncryptedMessageId,
        string memory fromEncryptedSymmetricObj,
        bytes32 toEncryptedMessageId,
        string memory toEncryptedSymmetricObj
    ) external {
        _emailIds.increment();
        uint256 newEmailId = _emailIds.current();

        Email memory _email = Email(
            newEmailId,
            msg.sender,
            to,
            block.timestamp
        );

        // add mapping from encrypted message id to the email id;
        encryptedMessageIdToEmail[fromEncryptedMessageId] = _email;
        encryptedMessageIdToEmail[toEncryptedMessageId] = _email;

        // add email to mappings
        toEmails[to].push(_email);
        fromEmails[msg.sender].push(_email);

        EmailUserMetaData memory _fromMetadata = EmailUserMetaData(
            fromEncryptedMessageId,
            fromEncryptedSymmetricObj,
            false,
            false,
            true // sender has read the email
        );
        emailUserMetadata[newEmailId][msg.sender] = _fromMetadata;

        EmailUserMetaData memory _toMetadata = EmailUserMetaData(
            toEncryptedMessageId,
            toEncryptedSymmetricObj,
            false,
            false,
            false
        );
        emailUserMetadata[newEmailId][to] = _toMetadata;

        emit EmailSent(newEmailId, msg.sender, to, block.timestamp);
    }

    function getAllEmailsByFromAddress(address from)
        external
        view
        returns (EmailWithUserMetaData[] memory)
    {
        return _filterDeletedEmails(fromEmails[from], from);
    }

    function getAllEmailsByToAddress(address to)
        external
        view
        returns (EmailWithUserMetaData[] memory)
    {
        return _filterDeletedEmails(toEmails[to], to);
    }

    function getMessageById(bytes32 encryptedMessageId)
        external
        view
        returns (EmailWithUserMetaData memory)
    {
        return
            _getEmailWithMetadata(
                encryptedMessageIdToEmail[encryptedMessageId],
                msg.sender
            );
    }

    function deleteMessage(bytes32 _encryptedMessageId, bool _deleted)
        external
        onlySenderOrRecipient(_encryptedMessageId)
    {
        emailUserMetadata[encryptedMessageIdToEmail[_encryptedMessageId].id][
            msg.sender
        ].deleted = _deleted;

        emit EmailDeleted(
            msg.sender,
            _encryptedMessageId,
            _deleted,
            block.timestamp
        );
    }

    function markAsImportant(bytes32 _encryptedMessageId, bool _important)
        external
        onlySenderOrRecipient(_encryptedMessageId)
    {
        emailUserMetadata[encryptedMessageIdToEmail[_encryptedMessageId].id][
            msg.sender
        ].important = _important;

        emit EmailMarkedAsImportant(
            msg.sender,
            _encryptedMessageId,
            _important,
            block.timestamp
        );
    }

    function markAsRead(bytes32 _encryptedMessageId, bool _read)
        external
        onlyRecipient(_encryptedMessageId)
    {
        emailUserMetadata[encryptedMessageIdToEmail[_encryptedMessageId].id][
            msg.sender
        ].read = _read;

        emit EmailRead(msg.sender, _encryptedMessageId, _read, block.timestamp);
    }

    function getImportantEmails()
        external
        view
        returns (EmailWithUserMetaData[] memory)
    {
        uint256 maxEmailsQty = toEmails[msg.sender].length;
        EmailWithUserMetaData[] memory temporary = new EmailWithUserMetaData[](
            maxEmailsQty
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = toEmails[msg.sender][i];
            EmailWithUserMetaData
                memory emailsWithUserMetaData = _getEmailWithMetadata(
                    email,
                    msg.sender
                );
            if (
                emailsWithUserMetaData.important &&
                !emailsWithUserMetaData.deleted
            ) {
                temporary[counter] = emailsWithUserMetaData;
                counter++;
            }
        }

        EmailWithUserMetaData[] memory result = new EmailWithUserMetaData[](
            counter
        );
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    function getDeletedEmails()
        external
        view
        returns (EmailWithUserMetaData[] memory)
    {
        uint256 maxEmailsQty = toEmails[msg.sender].length;
        EmailWithUserMetaData[] memory temporary = new EmailWithUserMetaData[](
            maxEmailsQty
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = toEmails[msg.sender][i];
            EmailWithUserMetaData
                memory emailsWithUserMetaData = _getEmailWithMetadata(
                    email,
                    msg.sender
                );
            if (emailsWithUserMetaData.deleted) {
                temporary[counter] = emailsWithUserMetaData;
                counter++;
            }
        }

        EmailWithUserMetaData[] memory result = new EmailWithUserMetaData[](
            counter
        );
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function _getEmailWithMetadata(Email memory _email, address _user)
        private
        view
        returns (EmailWithUserMetaData memory)
    {
        EmailUserMetaData memory emailMetaData = emailUserMetadata[_email.id][
            _user
        ];

        EmailWithUserMetaData memory emailWithMetadata = EmailWithUserMetaData(
            _email.id,
            _email.from,
            _email.to,
            _email.createdAt,
            emailMetaData.encryptedMessageId,
            emailMetaData.encryptedSymmetricObj,
            emailMetaData.important,
            emailMetaData.deleted,
            emailMetaData.read
        );
        return emailWithMetadata;
    }

    function _filterDeletedEmails(Email[] memory _emails, address _user)
        private
        view
        returns (EmailWithUserMetaData[] memory)
    {
        uint256 maxEmailsQty = _emails.length;

        EmailWithUserMetaData[] memory temporary = new EmailWithUserMetaData[](
            maxEmailsQty
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = _emails[i];
            EmailWithUserMetaData
                memory emailWithUserMetaData = _getEmailWithMetadata(
                    email,
                    _user
                );
            if (!emailWithUserMetaData.deleted) {
                temporary[counter] = emailWithUserMetaData;
                counter++;
            }
        }

        EmailWithUserMetaData[] memory result = new EmailWithUserMetaData[](
            counter
        );
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    function _getEmailsWithUserMetaData(Email[] memory _emails, address _user)
        private
        view
        returns (EmailWithUserMetaData[] memory)
    {
        EmailWithUserMetaData[]
            memory emailsWithUserMetaData = new EmailWithUserMetaData[](
                _emails.length
            );
        for (uint256 i = 0; i < _emails.length; i++) {
            Email memory email = _emails[i];
            emailsWithUserMetaData[i] = _getEmailWithMetadata(email, _user);
        }

        return emailsWithUserMetaData;
    }
}
