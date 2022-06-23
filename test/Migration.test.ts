import { expect } from 'chai';
import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, upgrades, run } from 'hardhat';
const { utils, provider, constants } = ethers;

const abiCoder = new utils.AbiCoder();

const SENDERS = [
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_SENDER_1'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_SENDER_1',
  },
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_SENDER_2'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_SENDER_2',
  },
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_SENDER_3'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_SENDER_3',
  },
];

const RECIPIENTS = [
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_RECIPIENT_1'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_1',
  },
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_RECIPIENT_2'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_2',
  },
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_RECIPIENT_3'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_3',
  },
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_RECIPIENT_4'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_4',
  },
  {
    ENCRYPTED_ID: utils.formatBytes32String('ENCRYPTED_ID_RECIPIENT_5'),
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_5',
  },
];

const handle = 'handle';

describe('PointEmail', () => {
  let contract: Contract;
  let newContract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;

  before(async () => {
    [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PointEmail');
    contract = await upgrades.deployProxy(Factory, [constants.AddressZero, handle], {
      kind: 'uups',
    });
    await contract.deployed();

    newContract = await upgrades.deployProxy(Factory, [constants.AddressZero, handle], {
      kind: 'uups',
    });
    await newContract.deployed();
  });

  async function createEmail(
    sender: SignerWithAddress,
    encryptedId: string,
    encryptedContent: string
  ): Promise<BigNumber> {
    const tx = await contract.connect(sender).send(encryptedId, encryptedContent);
    const receipt = await tx.wait();

    const emailId: BigNumber = receipt.events[0].args[0];

    console.log('new email id', emailId.toNumber());

    return emailId;
  }

  async function addRecipient(
    emailId: BigNumber,
    recipient: string,
    encryptedMessageId: string,
    encryptedSymmetricObj: string,
    cc: boolean = false
  ): Promise<ContractReceipt> {
    const tx = await contract
      .connect(user1)
      .addRecipientToEmail(emailId, recipient, encryptedMessageId, encryptedSymmetricObj, cc);
    const receipt = await tx.wait();
    return receipt;
  }

  describe('should be able to get the data from contract store', async () => {
    before(async () => {
      const newEmailId = await createEmail(
        user1,
        SENDERS[0].ENCRYPTED_ID,
        SENDERS[0].ENCRYPTED_CONTENT
      );
      await Promise.all([
        addRecipient(
          newEmailId,
          user2.address,
          RECIPIENTS[0].ENCRYPTED_ID,
          RECIPIENTS[0].ENCRYPTED_CONTENT,
          false
        ),
        addRecipient(
          newEmailId,
          user3.address,
          RECIPIENTS[1].ENCRYPTED_ID,
          RECIPIENTS[1].ENCRYPTED_CONTENT,
          true
        ),
        addRecipient(
          newEmailId,
          user4.address,
          RECIPIENTS[1].ENCRYPTED_ID,
          RECIPIENTS[1].ENCRYPTED_CONTENT,
          true
        ),
      ]);

      const newEmailId2 = await createEmail(
        user1,
        SENDERS[0].ENCRYPTED_ID,
        SENDERS[0].ENCRYPTED_CONTENT
      );
      await Promise.all([
        addRecipient(
          newEmailId2,
          user2.address,
          RECIPIENTS[0].ENCRYPTED_ID,
          RECIPIENTS[0].ENCRYPTED_CONTENT,
          false
        ),
        addRecipient(
          newEmailId2,
          user3.address,
          RECIPIENTS[1].ENCRYPTED_ID,
          RECIPIENTS[1].ENCRYPTED_CONTENT,
          false
        ),
      ]);

      const newEmailId3 = await createEmail(
        user1,
        SENDERS[0].ENCRYPTED_ID,
        SENDERS[0].ENCRYPTED_CONTENT
      );
      await Promise.all([
        addRecipient(
          newEmailId3,
          user2.address,
          RECIPIENTS[0].ENCRYPTED_ID,
          RECIPIENTS[0].ENCRYPTED_CONTENT,
          false
        ),
        addRecipient(
          newEmailId3,
          user3.address,
          RECIPIENTS[1].ENCRYPTED_ID,
          RECIPIENTS[1].ENCRYPTED_CONTENT,
          false
        ),
      ]);
    });

    it('get data for migration', async () => {
      await run('email-migrate', {
        oldContractAddress: contract.address,
        newContractAddress: newContract.address,
      });
    });
  });
});
