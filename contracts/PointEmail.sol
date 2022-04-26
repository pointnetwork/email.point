// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "hardhat/console.sol";

contract PointEmail is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using Counters for Counters.Counter;
    Counters.Counter internal _emailIds;

    struct Email {
        uint256 id;
        address from;
        address[] to;
        bytes32 encryptedMessageId;
        uint256 createdAt;
    }

    struct EmailUserMetaData {
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    struct EmailWithUserMetaData {
        uint256 id;
        address from;
        address[] to;
        bytes32 encryptedMessageId;
        uint256 createdAt;
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    // Email mappings
    mapping(uint256 => bytes32) private emailIdToEncryptedMessageId;
    mapping(bytes32 => Email) private encryptedMessageIdToEmail;
    mapping(address => Email[]) private toEmails;
    mapping(address => Email[]) private fromEmails;
    mapping(address => mapping(uint256 => EmailUserMetaData)) private emailUserMetadata;

    event EmailSent(
        uint256 indexed id,
        address indexed from,
        address[] to,
        uint256 indexed timestamp
    );

    event EmailDeleted(
        address indexed user,
        uint256 indexed id,
        bool indexed deleted,
        uint256 timestamp
    );

    event EmailMarkedAsImportant(
        address indexed user,
        uint256 indexed id,
        bool indexed important,
        uint256 timestamp
    );

    event EmailRead(
        address indexed user,
        uint256 indexed id,
        bool indexed read,
        uint256 timestamp
    );

    modifier onlySenderOrRecipient(uint256 _emailId) {
        require(
            bytes(emailUserMetadata[msg.sender][_emailId].encryptedSymmetricObj).length !=
                0,
            "Permission Denied"
        );
        _;
    }

    function send(
        string memory fromEncryptedSymmetricObj,
        address[] memory to,
        string[] memory encryptedSymmetricObjs,
        bytes32 encryptedMessageId
    ) external {
        require(to.length == encryptedSymmetricObjs.length, "Invalid parameters");

        _emailIds.increment();
        uint256 newEmailId = _emailIds.current();

        Email memory _email = Email(
            newEmailId,
            msg.sender,
            to,
            encryptedMessageId,
            block.timestamp
        );

        _saveUserEmailMetadata(newEmailId, msg.sender, fromEncryptedSymmetricObj);

        fromEmails[msg.sender].push(_email);

        for (uint256 i = 0; i < to.length; i++) {
            _saveUserEmailMetadata(newEmailId, to[i], encryptedSymmetricObjs[i]);
            toEmails[to[i]].push(_email);
        }

        encryptedMessageIdToEmail[encryptedMessageId] = _email;
        emailIdToEncryptedMessageId[newEmailId] = encryptedMessageId;

        emit EmailSent(newEmailId, msg.sender, to, block.timestamp);
    }

    function getEmailById(uint256 _emailId)
        external
        view
        returns (EmailWithUserMetaData memory)
    {
        return
            _getEmailWithMetadata(
                encryptedMessageIdToEmail[emailIdToEncryptedMessageId[_emailId]],
                msg.sender
            );
    }

    function getEmailByEncryptedMessageId(bytes32 _encryptedMessageId)
        external
        view
        returns (EmailWithUserMetaData memory)
    {
        return
            _getEmailWithMetadata(
                encryptedMessageIdToEmail[_encryptedMessageId],
                msg.sender
            );
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

    function deleteMessage(uint256 _emailId, bool _deleted)
        external
        onlySenderOrRecipient(_emailId)
    {
        emailUserMetadata[msg.sender][_emailId].deleted = _deleted;

        emit EmailDeleted(msg.sender, _emailId, _deleted, block.timestamp);
    }

    function markAsImportant(uint256 _emailId, bool _important)
        external
        onlySenderOrRecipient(_emailId)
    {
        emailUserMetadata[msg.sender][_emailId].important = _important;

        emit EmailMarkedAsImportant(msg.sender, _emailId, _important, block.timestamp);
    }

    function markAsRead(uint256 _emailId, bool _read)
        external
        onlySenderOrRecipient(_emailId)
    {
        emailUserMetadata[msg.sender][_emailId].read = _read;

        emit EmailRead(msg.sender, _emailId, _read, block.timestamp);
    }

    function getImportantEmails() external view returns (EmailWithUserMetaData[] memory) {
        uint256 maxEmailsQty = toEmails[msg.sender].length;
        EmailWithUserMetaData[] memory temporary = new EmailWithUserMetaData[](
            maxEmailsQty
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = toEmails[msg.sender][i];
            EmailWithUserMetaData memory emailsWithUserMetaData = _getEmailWithMetadata(
                email,
                msg.sender
            );
            if (emailsWithUserMetaData.important && !emailsWithUserMetaData.deleted) {
                temporary[counter] = emailsWithUserMetaData;
                counter++;
            }
        }

        EmailWithUserMetaData[] memory result = new EmailWithUserMetaData[](counter);
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    function getDeletedEmails() external view returns (EmailWithUserMetaData[] memory) {
        uint256 maxEmailsQty = toEmails[msg.sender].length;
        EmailWithUserMetaData[] memory temporary = new EmailWithUserMetaData[](
            maxEmailsQty
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = toEmails[msg.sender][i];
            EmailWithUserMetaData memory emailsWithUserMetaData = _getEmailWithMetadata(
                email,
                msg.sender
            );
            if (emailsWithUserMetaData.deleted) {
                temporary[counter] = emailsWithUserMetaData;
                counter++;
            }
        }

        EmailWithUserMetaData[] memory result = new EmailWithUserMetaData[](counter);
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
        EmailUserMetaData memory emailMetaData = emailUserMetadata[_user][_email.id];
        EmailWithUserMetaData memory emailWithMetadata = EmailWithUserMetaData(
            _email.id,
            _email.from,
            _email.to,
            _email.encryptedMessageId,
            _email.createdAt,
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
            EmailWithUserMetaData memory emailWithUserMetaData = _getEmailWithMetadata(
                email,
                _user
            );
            if (!emailWithUserMetaData.deleted) {
                temporary[counter] = emailWithUserMetaData;
                counter++;
            }
        }

        EmailWithUserMetaData[] memory result = new EmailWithUserMetaData[](counter);
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
            memory emailsWithUserMetaData = new EmailWithUserMetaData[](_emails.length);
        for (uint256 i = 0; i < _emails.length; i++) {
            Email memory email = _emails[i];
            emailsWithUserMetaData[i] = _getEmailWithMetadata(email, _user);
        }

        return emailsWithUserMetaData;
    }

    function _saveUserEmailMetadata(
        uint256 _emailId,
        address _user,
        string memory _encryptedSymmetricObj
    ) private {
        EmailUserMetaData memory _metaData = EmailUserMetaData(
            _encryptedSymmetricObj,
            false,
            false,
            false
        );

        emailUserMetadata[_user][_emailId] = _metaData;
    }
}
