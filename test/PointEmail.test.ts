import { expect } from 'chai';
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { run, ethers } from 'hardhat';

const { utils } = ethers;

const ENCRYPTED_ID_USER_1 = utils.formatBytes32String('ENCRYPTED_ID_USER_1');
const ENCRYPTED_CONTENT_USER_1 = 'ENCRYPTED_CONTENT_USER_1';
const ENCRYPTED_ID_USER_2 = utils.formatBytes32String('ENCRYPTED_ID_USER_2');
const ENCRYPTED_CONTENT_USER_2 = 'ENCRYPTED_CONTENT_USER_2';

describe('PointEmail', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PointEmail');
    contract = await Factory.deploy();
    await contract.deployed();
  });

  describe('if user1 sends an email to user2', () => {
    before(async () => {
      const tx = await contract
        .connect(user1)
        .send(
          user2.address,
          ENCRYPTED_ID_USER_1,
          ENCRYPTED_CONTENT_USER_1,
          ENCRYPTED_ID_USER_2,
          ENCRYPTED_CONTENT_USER_2
        );
      const receipt = await tx.wait();
    });

    it('user1 should have the email on his sent tab', async () => {
      const emails = await contract.connect(user1).getAllEmailsByFromAddress(user1.address);
      expect(emails.length).to.equal(1);
      const [email] = emails;
      expect(email.id.toString()).to.equal('1');
      expect(email.encryptedMessageId).to.equal(ENCRYPTED_ID_USER_1);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_CONTENT_USER_1);
    });

    it('user2 should have the email on his inbox tab', async () => {
      const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
      expect(emails.length).to.equal(1);
      const [email] = emails;
      expect(email.id.toString()).to.equal('1');
      expect(email.encryptedMessageId).to.equal(ENCRYPTED_ID_USER_2);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_CONTENT_USER_2);
    });

    describe('if the user2 deletes the email', () => {
      before(async () => {
        const tx = await contract.connect(user2).deleteMessage(ENCRYPTED_ID_USER_2, true);
        await tx.wait();
      });

      it('should see the email in his trash tab', async () => {
        const emails = await contract.connect(user2).getDeletedEmails();
        expect(emails.length).to.equal(1);
        const [email] = emails;
        expect(email.id.toString()).to.equal('1');
        expect(email.encryptedMessageId).to.equal(ENCRYPTED_ID_USER_2);
        expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_CONTENT_USER_2);
      });

      it('and the email should disapear from his inbox', async () => {
        const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
        expect(emails.length).to.equal(0);
      });

      describe('and user2 restores the email', () => {
        before(async () => {
          const tx = await contract.connect(user2).deleteMessage(ENCRYPTED_ID_USER_2, false);
          await tx.wait();
        });

        it('the email should be again in his inbox', async () => {
          const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
          expect(emails.length).to.equal(1);
          const [email] = emails;
          expect(email.id.toString()).to.equal('1');
          expect(email.encryptedMessageId).to.equal(ENCRYPTED_ID_USER_2);
          expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_CONTENT_USER_2);
        });
      });
    });
  });
});
