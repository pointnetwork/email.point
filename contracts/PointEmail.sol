// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IIdentity {
    function isIdentityDeployer(string memory, address)
        external
        view
        returns (bool);
}

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
        address[] cc;
        uint256 createdAt;
        string encryptedMessageId;
        string encryptedSymmetricObj;
        bool important;
        bool deleted;
        bool read;
    }

    // Email mappings
    mapping(uint256 => Email) public emailIdToEmail;
    mapping(address => Email[]) public toEmails;
    mapping(address => Email[]) public fromEmails;
    mapping(uint256 => mapping(address => EmailUserMetaData))
        public emailUserMetadata;

    mapping(uint256 => address[]) private emailCC;

    // upgradeability variables
    address private identityContractAddress;
    string private identityHandle;

    // to avoid collision meanwhile migration is running
    uint256 public constant INITIAL_EMAIL_ID = 200;
    address public constant MIGRATOR_ADDRESS =
        0xb22bC58330d624EB2c6863FB1f562E529139C628;
    address public constant MIGRATOR_ADDRESS_2 =
        0x61771B01573810bD0593EDEABa905B4e83cF3E9e;

    event EmailCreated(uint256 id, address indexed from, uint256 timestamp);

    event RecipientAdded(
        uint256 id,
        address indexed recipient,
        bool indexed cc,
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

    event EmailMigrated(uint256 indexed id, uint256 timestamp);

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

    function addEmailFromMigration(
        uint256 _id,
        address _from,
        address[] calldata _to,
        address[] calldata _cc,
        uint256 _createdAt,
        address[] calldata _users,
        EmailUserMetaData[] calldata _metadata
    ) external {
        require(
            msg.sender == MIGRATOR_ADDRESS || msg.sender == MIGRATOR_ADDRESS_2,
            "access denied"
        );
        require(emailIdToEmail[_id].from == address(0), "email already exists");

        Email memory _email = Email(_id, _from, _to, _createdAt);

        emailIdToEmail[_id] = _email;

        emailCC[_id] = _cc;

        fromEmails[_from].push(_email);

        for (uint256 i = 0; i < _to.length; i++) {
            toEmails[_to[i]].push(_email);
        }

        for (uint256 i = 0; i < _cc.length; i++) {
            toEmails[_cc[i]].push(_email);
        }

        for (uint256 i = 0; i < _users.length; i++) {
            emailUserMetadata[_id][_users[i]] = _metadata[i];
        }

        emit EmailMigrated(_id, block.timestamp);
    }

    /**
     * @notice This function should be used to send a new email to a recipient
     * @dev Send a new email to a recipient
     * @param _fromEncryptedMessageId - The stored message id for the sender
     * @param _fromEncryptedSymmetricObj - The encryption settings for the sender
     */
    function send(
        string calldata _fromEncryptedMessageId,
        string calldata _fromEncryptedSymmetricObj
    ) external {
        // New email id
        _emailIds.increment();
        uint256 newEmailId = INITIAL_EMAIL_ID + _emailIds.current();

        address[] memory _emptyToArray;

        // New email object
        Email memory _email = Email(
            newEmailId,
            msg.sender,
            _emptyToArray,
            block.timestamp
        );

        emailIdToEmail[newEmailId] = _email;

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

        emit EmailCreated(newEmailId, msg.sender, block.timestamp);
    }

    /**
     * @notice Add a recipient to a created email
     * @dev Add a recipient to a created email
     * @param _emailId - Email id
     * @param _recipient - Recipient address
     * @param _recipientEncryptedMessageId - The recipients stored message ids
     * @param _recipientEncryptedSymmetricObj - The recipients settings
     * @param cc - Recipient added as cc
     */
    function addRecipientToEmail(
        uint256 _emailId,
        address _recipient,
        string calldata _recipientEncryptedMessageId,
        string calldata _recipientEncryptedSymmetricObj,
        bool cc
    ) external onlySender(_emailId) validEmail(_emailId) {
        Email storage email = emailIdToEmail[_emailId];

        require(
            email.createdAt + 5 minutes >= block.timestamp,
            "More recipients not allowed"
        );

        require(
            cc || !_isInAddressArray(_recipient, email.to),
            "Recipient already in email (to)"
        );

        require(
            !cc || !_isInAddressArray(_recipient, emailCC[_emailId]),
            "Recipient already in email (cc)"
        );

        toEmails[_recipient].push(email);

        if (cc) {
            emailCC[_emailId].push(_recipient);
        } else {
            email.to.push(_recipient);
        }

        bool metadaAlreadyAdded = bytes(
            emailUserMetadata[_emailId][_recipient].encryptedSymmetricObj
        ).length != 0;

        if (!metadaAlreadyAdded) {
            EmailUserMetaData memory _toMetadata = EmailUserMetaData(
                _recipientEncryptedMessageId,
                _recipientEncryptedSymmetricObj,
                false,
                false,
                false
            );

            emailUserMetadata[_emailId][_recipient] = _toMetadata;
        }

        emit RecipientAdded(_emailId, _recipient, cc, block.timestamp);
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
        Email memory _email = emailIdToEmail[_emailId];
        // new version
        if (_email.from != address(0)) {
            return _getEmailWithMetadata(_email, msg.sender);
        }

        // old version compatibylity
        for (uint256 i = 0; i < toEmails[msg.sender].length; i++) {
            _email = toEmails[msg.sender][i];
            if (_email.id == _emailId) {
                return _getEmailWithMetadata(_email, msg.sender);
            }
        }

        for (uint256 i = 0; i < fromEmails[msg.sender].length; i++) {
            _email = fromEmails[msg.sender][i];
            if (_email.id == _emailId) {
                return _getEmailWithMetadata(_email, msg.sender);
            }
        }

        revert("error");
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

    function initialize(
        address _identityContractAddress,
        string calldata _identityHandle
    ) public initializer onlyProxy {
        __Ownable_init();
        __UUPSUpgradeable_init();
        identityContractAddress = _identityContractAddress;
        identityHandle = _identityHandle;
    }

    function _authorizeUpgrade(address) internal view override {
        require(
            IIdentity(identityContractAddress).isIdentityDeployer(
                identityHandle,
                msg.sender
            ),
            "Not a deployer"
        );
    }

    function _isInAddressArray(address _address, address[] memory _array)
        private
        pure
        returns (bool)
    {
        for (uint256 i; i < _array.length; i++) {
            if (_array[i] == _address) {
                return true;
            }
        }

        return false;
    }

    function _getEmailWithMetadata(Email memory _email, address _user)
        private
        view
        returns (EmailWithUserMetaData memory)
    {
        EmailUserMetaData memory emailMetaData = emailUserMetadata[_email.id][
            _user
        ];

        address[] memory emailCCArray = emailCC[_email.id];

        EmailWithUserMetaData memory emailWithMetadata = EmailWithUserMetaData(
            _email.id,
            _email.from,
            _email.to,
            emailCCArray,
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

    function isMigrator() public view returns (bool) {
        return
            msg.sender == MIGRATOR_ADDRESS || msg.sender == MIGRATOR_ADDRESS_2;
    }
}
