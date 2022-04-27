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
        address[] to;
        uint256 createdAt;
    }

    struct EmailUserMetaData {
        string encryptedMessageId;
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    struct EmailWithUserMetaData {
        uint256 id;
        address from;
        address[] to;
        uint256 createdAt;
        string encryptedMessageId;
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    // Email mappings
    mapping(uint256 => Email) private emailIdToEmail;
    mapping(address => Email[]) private toEmails;
    mapping(address => Email[]) private fromEmails;

    // workaround until we can get the email id from events
    mapping(string => uint256) private fromEncryptedMessageIdToEmailId;

    mapping(uint256 => mapping(address => EmailUserMetaData))
        private emailUserMetadata;

    event EmailCreated(uint256 id, address indexed from, uint256 timestamp);

    event RecipientAdded(
        uint256 id,
        address indexed recipient,
        uint256 timestamp
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

    modifier validEmail(uint256 _emailId) {
        require(emailIdToEmail[_emailId].id == _emailId, "Invalid Email");
        _;
    }

    modifier onlySenderOrRecipient(uint256 _emailId) {
        require(
            emailIdToEmail[_emailId].from == msg.sender ||
                bytes(
                    emailUserMetadata[_emailId][msg.sender].encryptedMessageId
                ).length !=
                0,
            "Permission Denied"
        );
        _;
    }

    modifier onlySender(uint256 _emailId) {
        require(emailIdToEmail[_emailId].from == msg.sender, "Only Sender");
        _;
    }

    modifier onlyRecipient(uint256 _emailId) {
        require(
            emailIdToEmail[_emailId].from == msg.sender ||
                bytes(
                    emailUserMetadata[_emailId][msg.sender].encryptedMessageId
                ).length !=
                0,
            "Only Recipient"
        );
        _;
    }

    /**
     * @notice This function should be used to send a new email to a recipient
     * @dev Send a new email to a recipient
     * @param _fromEncryptedMessageId - The stored message id for the sender
     * @param _fromEncryptedSymmetricObj - The encryption settings for the sender
     */
    function send(
        string memory _fromEncryptedMessageId,
        string memory _fromEncryptedSymmetricObj
    ) external {
        // New email id
        _emailIds.increment();
        uint256 newEmailId = _emailIds.current();

        address[] memory _emptyToArray;

        // New email object
        Email memory _email = Email(
            newEmailId,
            msg.sender,
            _emptyToArray,
            block.timestamp
        );

        emailIdToEmail[newEmailId] = _email;

        // workaround until we have the email id from events on the frontend
        fromEncryptedMessageIdToEmailId[_fromEncryptedMessageId] = newEmailId;

        // sender info
        fromEmails[msg.sender].push(_email);
        EmailUserMetaData memory _fromMetadata = EmailUserMetaData(
            _fromEncryptedMessageId,
            _fromEncryptedSymmetricObj,
            false,
            false,
            true // sender has read the email
        );
        emailUserMetadata[newEmailId][msg.sender] = _fromMetadata;

        // recipients info
        /*
        for (uint256 i = 0; i < _to.length; i++) {
            toEmails[_to[i]].push(_email);

            EmailUserMetaData memory _toMetadata = EmailUserMetaData(
                _recipientsEncryptedMessageIds[i],
                _recipientsEncryptedSymmetricObjs[i],
                false,
                false,
                false
            );

            emailUserMetadata[newEmailId][_to[i]] = _toMetadata;
        }
        */

        emit EmailCreated(newEmailId, msg.sender, block.timestamp);
    }

    /**
     * @notice Get Email Id from sender encrypted message id
     * @dev Get Email Id from sender encrypted message id
     * @param _fromEncryptedMessageId - Sender encrypted message id
     */
    function getEmailIdBySenderEncryptedMessageId(
        string memory _fromEncryptedMessageId
    ) external view returns (uint256) {
        return fromEncryptedMessageIdToEmailId[_fromEncryptedMessageId];
    }

    /**
     * @notice Add a recipient to a created email
     * @dev Add a recipient to a created email
     * @param _emailId - Email id
     * @param _recipient - Recipient address
     * @param _recipientEncryptedMessageId - The recipients stored message ids
     * @param _recipientEncryptedSymmetricObj - The recipients settings
     */
    function addRecipientToEmail(
        uint256 _emailId,
        address _recipient,
        string memory _recipientEncryptedMessageId,
        string memory _recipientEncryptedSymmetricObj
    ) external onlySender(_emailId) validEmail(_emailId) {
        // Don't add the same recipient twice
        require(
            bytes(emailUserMetadata[_emailId][_recipient].encryptedSymmetricObj)
                .length == 0,
            "Recipient already added"
        );

        Email storage email = emailIdToEmail[_emailId];

        toEmails[_recipient].push(email);

        email.to.push(_recipient);

        EmailUserMetaData memory _toMetadata = EmailUserMetaData(
            _recipientEncryptedMessageId,
            _recipientEncryptedSymmetricObj,
            false,
            false,
            false
        );

        emailUserMetadata[_emailId][_recipient] = _toMetadata;

        emit RecipientAdded(_emailId, _recipient, block.timestamp);
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
