// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @dev Implementation of email.point's smart contract.
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
    mapping(uint256 => Email) private emailIdToEmail;
    mapping(address => Email[]) private toEmails;
    mapping(address => Email[]) private fromEmails;

    mapping(uint256 => mapping(address => EmailUserMetaData))
        private emailUserMetadata;

    event EmailSent(
        uint256 id,
        address indexed from,
        address indexed to,
        uint256 indexed timestamp
    );

    event EmailDeleted(
        address indexed user,
        uint256 indexed id,
        bool deleted,
        uint256 timestamp
    );

    event EmailMarkedAsImportant(
        address indexed user,
        uint256 indexed id,
        bool important,
        uint256 timestamp
    );

    event EmailRead(
        address indexed user,
        uint256 indexed id,
        bool read,
        uint256 timestamp
    );

    modifier onlySenderOrRecipient(uint256 _emailId) {
        require(
            emailIdToEmail[_emailId].from == msg.sender ||
                emailIdToEmail[_emailId].to == msg.sender,
            "Permission Denied"
        );
        _;
    }

    modifier onlyRecipient(uint256 _emailId) {
        require(emailIdToEmail[_emailId].to == msg.sender, "Only Recipient");
        _;
    }

    /**
     * @notice This function should be used to send a new email to a recipient
     * @dev Send a new email to a recipient
     * @param _to - The recipient address
     * @param _fromEncryptedMessageId - The stored message id for the sender
     * @param _fromEncryptedSymmetricObj - The encryption settings for the sender
     * @param _toEncryptedMessageId - The stored message id for the sender
     * @param _toEncryptedSymmetricObj - The encryption settings for the sender
     */
    function send(
        address _to,
        bytes32 _fromEncryptedMessageId,
        string memory _fromEncryptedSymmetricObj,
        bytes32 _toEncryptedMessageId,
        string memory _toEncryptedSymmetricObj
    ) external {
        _emailIds.increment();
        uint256 newEmailId = _emailIds.current();

        Email memory _email = Email(
            newEmailId,
            msg.sender,
            _to,
            block.timestamp
        );

        emailIdToEmail[newEmailId] = _email;

        // add email to mappings
        toEmails[_to].push(_email);
        fromEmails[msg.sender].push(_email);

        EmailUserMetaData memory _fromMetadata = EmailUserMetaData(
            _fromEncryptedMessageId,
            _fromEncryptedSymmetricObj,
            false,
            false,
            true // sender has read the email
        );
        emailUserMetadata[newEmailId][msg.sender] = _fromMetadata;

        EmailUserMetaData memory _toMetadata = EmailUserMetaData(
            _toEncryptedMessageId,
            _toEncryptedSymmetricObj,
            false,
            false,
            false
        );
        emailUserMetadata[newEmailId][_to] = _toMetadata;

        emit EmailSent(newEmailId, msg.sender, _to, block.timestamp);
    }

    /**
     * @notice This function returns all non deleted emails sent by an address
     * @dev Get all emails sent by an address
     * @param _from - The user address
     */
    function getAllEmailsByFromAddress(address _from)
        external
        view
        returns (EmailWithUserMetaData[] memory)
    {
        return _filterDeletedEmails(fromEmails[_from], _from);
    }

    /**
     * @notice This function returns all non deleted emails send to an address
     * @dev Get all emails sent to an address
     * @param _to - The user address
     */
    function getAllEmailsByToAddress(address _to)
        external
        view
        returns (EmailWithUserMetaData[] memory)
    {
        return _filterDeletedEmails(toEmails[_to], _to);
    }

    /**
     * @notice Get an email by id (user metadata included)
     * @dev Get an email by id (user metadata included)
     * @param _emailId - The message id
     */
    function getEmailById(uint256 _emailId)
        external
        view
        returns (EmailWithUserMetaData memory)
    {
        return _getEmailWithMetadata(emailIdToEmail[_emailId], msg.sender);
    }

    /**
     * @notice Mark an email as deleted by id
     * @dev Mark an email as deleted by id
     * @param _emailId - The email id
     * @param _deleted - A boolean that represents if the email was deleted
     */
    function deleteEmail(uint256 _emailId, bool _deleted)
        external
        onlySenderOrRecipient(_emailId)
    {
        emailUserMetadata[_emailId][msg.sender].deleted = _deleted;

        emit EmailDeleted(msg.sender, _emailId, _deleted, block.timestamp);
    }

    /**
     * @notice Mark an email as important by id
     * @dev Mark an email as important by id
     * @param _emailId - The email id
     * @param _important - A boolean that represents if the email was marked as important
     */
    function markAsImportant(uint256 _emailId, bool _important)
        external
        onlySenderOrRecipient(_emailId)
    {
        emailUserMetadata[_emailId][msg.sender].important = _important;

        emit EmailMarkedAsImportant(
            msg.sender,
            _emailId,
            _important,
            block.timestamp
        );
    }

    /**
     * @notice Mark an email as read by id
     * @dev Mark an email as read by id
     * @param _emailId - The email id
     * @param _read - A boolean that represents if the email was read
     */
    function markAsRead(uint256 _emailId, bool _read)
        external
        onlyRecipient(_emailId)
    {
        emailUserMetadata[_emailId][msg.sender].read = _read;

        emit EmailRead(msg.sender, _emailId, _read, block.timestamp);
    }

    /**
     * @notice Get all the emails marked as important received by an user
     * @dev Get all the emails marked as important received by an user
     * @return A list of important emails with user's metadata
     */
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

    /**
     * @notice Get all the emails marked as deleted by an user
     * @dev Get all the emails marked as deleted by an user
     * @return A list of deleted emails with user's metadata
     */
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
