import { expect } from 'chai';
import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

const SENDER = {
  ENCRYPTED_ID: 'ENCRYPTED_ID_SENDER',
  ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_SENDER',
};

const RECIPIENTS = [
  {
    ENCRYPTED_ID: 'ENCRYPTED_ID_RECIPIENT_1',
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_1',
  },
  {
    ENCRYPTED_ID: 'ENCRYPTED_ID_RECIPIENT_2',
    ENCRYPTED_CONTENT: 'ENCRYPTED_CONTENT_RECIPIENT_2',
  },
];

type EmailWithMetaData = {
  id: number;
  from: string;
  to: string[];
  cc: string[];
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
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;
  let emailId: BigNumber;

  before(async () => {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('PointEmail');
    contract = await Factory.deploy();
    await contract.deployed();

    let tx = await contract
      .connect(user1)
      .send(
        SENDER.ENCRYPTED_ID,
        SENDER.ENCRYPTED_CONTENT,
        [user2.address, user3.address],
        [RECIPIENTS[0].ENCRYPTED_ID, RECIPIENTS[1].ENCRYPTED_ID],
        [RECIPIENTS[0].ENCRYPTED_CONTENT, RECIPIENTS[1].ENCRYPTED_CONTENT],
        [false, true]
      );

    const receipt = await tx.wait();
    emailId = receipt.events[0].args.id;
    console.log(emailId);
  });

  it('user1 should have the email on his sent tab', async () => {
    const emails: EmailWithMetaData[] = await contract
      .connect(user1)
      .getAllEmailsByFromAddress(user1.address);
    expect(emails.length).to.equal(1);
    const [email] = emails;
    expect(email.id.toString()).to.equal(emailId.toString());
    expect(email.encryptedMessageId).to.equal(SENDER.ENCRYPTED_ID);
    expect(email.encryptedSymmetricObj).to.equal(SENDER.ENCRYPTED_CONTENT);
  });

  it('user2 should have the email on his inbox tab', async () => {
    const emails: EmailWithMetaData[] = await contract
      .connect(user2)
      .getAllEmailsByToAddress(user2.address);
    expect(emails.length).to.equal(1);
    const [email] = emails;
    expect(email.id.toString()).to.equal(emailId.toString());
    expect(email.encryptedMessageId).to.equal(RECIPIENTS[0].ENCRYPTED_ID);
    expect(email.encryptedSymmetricObj).to.equal(RECIPIENTS[0].ENCRYPTED_CONTENT);
  });

  it(`user3 should be added as cc`, async () => {
    const email: EmailWithMetaData = await contract.connect(user3).getEmailById(emailId);
    expect(email.from).to.not.equal(user3.address);
    expect(email.to.includes(user3.address)).to.equal(false);
    expect(email.cc.includes(user3.address)).to.equal(true);
  });

  describe('email read metadata', () => {
    it(`should be marked as read for sender`, async () => {
      const emailWithMetaData: EmailWithMetaData = await contract
        .connect(user1)
        .getEmailById(emailId);
      expect(emailWithMetaData.read).to.equal(true);
    });

    it(`should be marked as not read for recipient`, async () => {
      const emailWithMetaData: EmailWithMetaData = await contract
        .connect(user2)
        .getEmailById(emailId);
      expect(emailWithMetaData.read).to.equal(false);
    });

    describe('if user2 mark the email as read', () => {
      before(async () => {
        const tx = await contract.connect(user2).markAsRead(emailId, true);
        await tx.wait();
      });

      it(`email should be marked as read`, async () => {
        const emailWithMetaData: EmailWithMetaData = await contract
          .connect(user2)
          .getEmailById(emailId);
        expect(emailWithMetaData.read).to.equal(true);
      });
    });
  });

  describe('email important metadata', () => {
    before(async () => {
      const tx = await contract.connect(user2).markAsImportant(emailId, true);
      await tx.wait();
    });

    it(`email should be in user's /important tab`, async () => {
      const importantEmails: EmailWithMetaData[] = await contract
        .connect(user2)
        .getImportantEmails();

      expect(
        importantEmails.some(
          ({ encryptedMessageId }) => encryptedMessageId === RECIPIENTS[0].ENCRYPTED_ID
        )
      ).to.equal(true);
    });

    describe('and the user unmark the email as important', () => {
      before(async () => {
        const tx = await contract.connect(user2).markAsImportant(emailId, false);
        await tx.wait();
      });

      it(`should dissapear from the /important tab`, async () => {
        const importantEmails: EmailWithMetaData[] = await contract
          .connect(user2)
          .getImportantEmails();

        expect(
          importantEmails.some(
            ({ encryptedMessageId }) => encryptedMessageId === RECIPIENTS[0].ENCRYPTED_ID
          )
        ).to.equal(false);
      });
    });
  });
  describe('if the user2 deletes the email', () => {
    before(async () => {
      const tx = await contract.connect(user2).deleteEmail(emailId, true);
      await tx.wait();
    });

    it('should see the email in his trash tab', async () => {
      const emails = await contract.connect(user2).getDeletedEmails();
      expect(emails.length).to.equal(1);
      const [email] = emails;
      expect(email.id.toString()).to.equal('1');
      expect(email.encryptedMessageId).to.equal(RECIPIENTS[0].ENCRYPTED_ID);
      expect(email.encryptedSymmetricObj).to.equal(RECIPIENTS[0].ENCRYPTED_CONTENT);
    });

    it('and the email should disapear from his inbox', async () => {
      const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
      expect(emails.length).to.equal(0);
    });

    describe('and user2 restores the email', () => {
      before(async () => {
        const tx = await contract.connect(user2).deleteEmail(emailId, false);
        await tx.wait();
      });

      it('the email should be again in his inbox', async () => {
        const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
        expect(emails.length).to.equal(1);
        const [email] = emails;
        expect(email.id.toString()).to.equal('1');
        expect(email.encryptedMessageId).to.equal(RECIPIENTS[0].ENCRYPTED_ID);
        expect(email.encryptedSymmetricObj).to.equal(RECIPIENTS[0].ENCRYPTED_CONTENT);
      });
    });
  });
});
