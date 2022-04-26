import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

const { utils } = ethers;

const ENCRYPTED_ID_USER_1 = utils.formatBytes32String('ENCRYPTED_ID_USER_1');
const ENCRYPTED_CONTENT_USER_1 = 'ENCRYPTED_CONTENT_USER_1';
const ENCRYPTED_ID_USER_2 = utils.formatBytes32String('ENCRYPTED_ID_USER_2');
const ENCRYPTED_CONTENT_USER_2 = 'ENCRYPTED_CONTENT_USER_2';

type EmailWithMetaData = {
  id: number;
  from: string;
  to: string[];
  createdAt: number;
  encryptedMessageId: string;
  encryptedSymmetricObj: string;
  important: boolean;
  deleted: boolean;
  read: boolean;
};

describe('PointEmail', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let email1Id: BigNumber;
  before(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();
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
      email1Id = receipt.events[0].args.id;
    });

    it('user1 should have the email on his sent tab', async () => {
      const emails: EmailWithMetaData[] = await contract
        .connect(user1)
        .getAllEmailsByFromAddress(user1.address);
      expect(emails.length).to.equal(1);
      const [email] = emails;
      expect(email.id.toString()).to.equal('1');
      expect(email.encryptedMessageId).to.equal(ENCRYPTED_ID_USER_1);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_CONTENT_USER_1);
    });

    it('user2 should have the email on his inbox tab', async () => {
      const emails: EmailWithMetaData[] = await contract
        .connect(user2)
        .getAllEmailsByToAddress(user2.address);
      expect(emails.length).to.equal(1);
      const [email] = emails;
      expect(email.id.toString()).to.equal('1');
      expect(email.encryptedMessageId).to.equal(ENCRYPTED_ID_USER_2);
      expect(email.encryptedSymmetricObj).to.equal(ENCRYPTED_CONTENT_USER_2);
    });

    describe('email read metadata', () => {
      it(`should be marked as read for sender`, async () => {
        const emailWithMetaData: EmailWithMetaData = await contract
          .connect(user1)
          .getEmailById(email1Id);
        expect(emailWithMetaData.read).to.equal(true);
      });

      it(`should be marked as not read for recipient`, async () => {
        const emailWithMetaData: EmailWithMetaData = await contract
          .connect(user2)
          .getEmailById(email1Id);
        expect(emailWithMetaData.read).to.equal(false);
      });

      describe('if user2 mark the email as read', () => {
        before(async () => {
          const tx = await contract.connect(user2).markAsRead(email1Id, true);
          await tx.wait();
        });

        it(`email should be marked as read`, async () => {
          const emailWithMetaData: EmailWithMetaData = await contract
            .connect(user2)
            .getEmailById(email1Id);
          expect(emailWithMetaData.read).to.equal(true);
        });
      });
    });

    describe('email important metadata', () => {
      before(async () => {
        const tx = await contract.connect(user2).markAsImportant(email1Id, true);
        await tx.wait();
      });

      it(`email should be in user's /important tab`, async () => {
        const importantEmails: EmailWithMetaData[] = await contract
          .connect(user2)
          .getImportantEmails();

        expect(
          importantEmails.some(
            ({ encryptedMessageId }) => encryptedMessageId === ENCRYPTED_ID_USER_2
          )
        ).to.equal(true);
      });

      describe('and the user unmark the email as important', () => {
        before(async () => {
          const tx = await contract.connect(user2).markAsImportant(email1Id, false);
          await tx.wait();
        });

        it(`should dissapear from the /important tab`, async () => {
          const importantEmails: EmailWithMetaData[] = await contract
            .connect(user2)
            .getImportantEmails();

          expect(
            importantEmails.some(
              ({ encryptedMessageId }) => encryptedMessageId === ENCRYPTED_ID_USER_2
            )
          ).to.equal(false);
        });
      });
    });

    describe('if the user2 deletes the email', () => {
      before(async () => {
        const tx = await contract.connect(user2).deleteEmail(email1Id, true);
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
          const tx = await contract.connect(user2).deleteEmail(email1Id, false);
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
