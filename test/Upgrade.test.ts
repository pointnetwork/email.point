import { expect } from 'chai';
import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, upgrades } from 'hardhat';

const { utils } = ethers;

const ENCRYPTED_ID_USER_1 = utils.formatBytes32String('ENCRYPTED_ID_USER_1');
const ENCRYPTED_CONTENT_USER_1 = 'ENCRYPTED_CONTENT_USER_1';
const ENCRYPTED_ID_USER_2 = utils.formatBytes32String('ENCRYPTED_ID_USER_2');
const ENCRYPTED_CONTENT_USER_2 = 'ENCRYPTED_CONTENT_USER_2';

describe('upgrade', () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let emailId: number;
  async function deployOldContract() {
    const Factory = await ethers.getContractFactory('PointEmailV00');
    contract = await upgrades.deployProxy(Factory);
    await contract.deployed();
  }

  async function sendEmail() {
    let tx = await contract.connect(user1).send(ENCRYPTED_ID_USER_1, ENCRYPTED_CONTENT_USER_1);
    const receipt = await tx.wait();
    emailId = receipt.events[0].args.id;

    tx = await contract
      .connect(user1)
      .addRecipientToEmail(emailId, user2.address, ENCRYPTED_ID_USER_2, ENCRYPTED_CONTENT_USER_2);

    return receipt;
  }

  async function upgradeContract() {
    const FactoryV2 = await ethers.getContractFactory('PointEmail');
    contract = await upgrades.upgradeProxy(contract.address, FactoryV2);
  }

  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    await deployOldContract();
    await sendEmail();
  });

  /*

  it('fromEmails', async () => {
    const emails = await contract.connect(user1).getAllEmailsByFromAddress(user1.address);
    console.log(emails);
  });

  it('toEmails', async () => {
    const emails = await contract.connect(user2).getAllEmailsByToAddress(user2.address);
    console.log(emails);
  });
  
  
  it('getEmail', async () => {
    const email = await contract.connect(user1).getEmailById(emailId);
    console.log(email);
  });
  */

  describe('after upgrade', () => {
    before(async () => {
      await upgradeContract();
    });

    /*
    it.only('fromEmails', async () => {
      const emails = await contract.connect(user1).getAllEmailsByFromAddress(user1.address);
      console.log(emails);
    });

    it('toEmails', async () => {
      const emails = await contract.connect(user1).getAllEmailsByFromAddress(user1.address);
      console.log(emails);
    });
    */
    it('getEmail', async () => {
      const email = await contract.connect(user1).getEmailById(emailId);
      console.log(email);
    });
  });
});
