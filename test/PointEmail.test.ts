import { Contract, ContractReceipt } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

const { utils } = ethers;

const ENCRYPTED_MESSAGE_ID = utils.formatBytes32String('ENCRYPTED_MESSAGE_ID');
const ENCRYPTED_SYMMETRIC_OBJECT_USER_1 = 'ENCRYPTED_SYMMETRIC_OBJECT_USER_1';
const ENCRYPTED_SYMMETRIC_OBJECT_USER_2 = 'ENCRYPTED_SYMMETRIC_OBJECT_USER_2';
const ENCRYPTED_SYMMETRIC_OBJECT_USER_3 = 'ENCRYPTED_SYMMETRIC_OBJECT_USER_3';

describe('PointEmail', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  before(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PointEmail');
    contract = await Factory.deploy();
    await contract.deployed();
  });

  describe('multi recipients email', () => {
    let receipt: ContractReceipt;
    let emailId: any;
    before(async () => {
      const tx = await contract.connect(user1).send(
        ENCRYPTED_SYMMETRIC_OBJECT_USER_1,
        [user2.address, user3.address], // RECIPIENTS
        [ENCRYPTED_SYMMETRIC_OBJECT_USER_2, ENCRYPTED_SYMMETRIC_OBJECT_USER_3], // ENCRYPTED OBJECTS BY ADDRESS INDEX
        ENCRYPTED_MESSAGE_ID
      );
      receipt = await tx.wait();
      emailId = receipt.events![0].args!.id;
    });

    it('user1 should be able to read the message', async () => {
      const emails = await contract.connect(user1).getAllEmailsByFromAddress(user1.address);
      const email = emails[0];
      expect(email.from).to.equal(user1.address);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_SYMMETRIC_OBJECT_USER_1);
    });

    it('user2 should be able to read the message', async () => {
      const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
      const email = emails[0];
      expect(email.to.indexOf(user2.address)).to.not.equal(-1);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_SYMMETRIC_OBJECT_USER_2);
    });

    it('user3 should be able to read the message', async () => {
      const [email] = await contract.connect(user3).getAllEmailsByToAddress(user3.address);
      expect(email.to.indexOf(user3.address)).to.not.equal(-1);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_SYMMETRIC_OBJECT_USER_3);
    });

    describe('mark as read', () => {
      before(async () => {
        const tx = await contract.connect(user1).markAsRead(emailId, true);
        await tx.wait();
      });

      it('users should be able to mark it as read', async () => {
        const email = await contract.connect(user1).getEmailById(emailId);
        expect(email.read).to.equal(true);
      });
    });

    describe('mark as important', () => {
      before(async () => {
        const tx = await contract.connect(user3).markAsImportant(emailId, true);
        await tx.wait();
      });

      it('users should be able to mark it as read', async () => {
        const email = await contract.connect(user3).getEmailById(emailId);
        expect(email.important).to.equal(true);
      });

      it(`should see the email on the /important tab`, async () => {
        const [email] = await contract.connect(user3).getImportantEmails();
        expect(email.id).to.equal(emailId);
      });
    });

    describe('if the user2 deletes the email', () => {
      before(async () => {
        const tx = await contract.connect(user2).deleteMessage(emailId, true);
        await tx.wait();
      });

      it(`the email should be marked as deleted for user2`, async () => {
        const email = await contract.connect(user2).getEmailById(emailId);
        expect(email.deleted).to.equal(true);
      });

      it('should see the email in his trash tab', async () => {
        const emails = await contract.connect(user2).getDeletedEmails();
        expect(emails.length).to.equal(1);
        const [email] = emails;
        expect(email.id.toString()).to.equal('1');
        expect(email.encryptedMessageId).to.equal(ENCRYPTED_MESSAGE_ID);
        expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_SYMMETRIC_OBJECT_USER_2);
      });

      it('and the email should disapear from his inbox', async () => {
        const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
        expect(emails.length).to.equal(0);
      });

      describe('and user2 restores the email', () => {
        before(async () => {
          const tx = await contract.connect(user2).deleteMessage(emailId, false);
          await tx.wait();
        });

        it('the email should be again in his inbox', async () => {
          const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
          expect(emails.length).to.equal(1);
          const [email] = emails;
          expect(email.id.toString()).to.equal('1');
          expect(email.encryptedMessageId).to.equal(ENCRYPTED_MESSAGE_ID);
          expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_SYMMETRIC_OBJECT_USER_2);
        });
      });
    });
  });
});
