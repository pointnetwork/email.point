import { Address } from 'cluster';
import { BigNumber, Contract, constants } from 'ethers';
import { task } from 'hardhat/config';

async function getLastEmailId(contract: Contract) {
  const bloomFilter = contract.filters.EmailCreated();
  const events = await contract.queryFilter(bloomFilter, 0, 'latest');

  const lastEvent = events.pop();

  const lastEmailId: BigNumber = lastEvent?.args?.id;
  return lastEmailId.toNumber();
}

async function getMigratedEmailIds(contract: Contract) {
  const bloomFilter = contract.filters.EmailMigrated();
  const events = await contract.queryFilter(bloomFilter, 0, 'latest');

  return events.map((event) => {
    return (event?.args?.id as BigNumber).toNumber();
  });
}

type EmailWithUserMetadata = {
  id: BigNumber;
  from: Address;
  to: Address[];
  cc: Address[];
  createdAt: BigNumber;
  encryptedMessageId: string;
  encryptedSymmetricObj: string;
  important: boolean;
  deleted: boolean;
  read: boolean;
};

type Metadata = {
  encryptedMessageId: string;
  encryptedSymmetricObj: string;
  important: boolean;
  deleted: boolean;
  read: boolean;
};

type EmailData = {
  id: BigNumber;
  from: Address;
  to: Address[];
  cc: Address[];
  createdAt: BigNumber;
  users: Address[];
  metadata: Metadata[];
};

async function getEmailData(contract: Contract, emailId: number): Promise<EmailData | undefined> {
  let emailData;
  try {
    emailData = await contract.getEmailById(emailId);
  } catch (err) {
    return;
  }

  const { cc, from, to, createdAt } = emailData;

  if (from == constants.AddressZero) {
    return;
  }

  const fromMetaData: EmailWithUserMetadata = await contract.emailUserMetadata(emailId, from);

  const toMetadata: EmailWithUserMetadata[] = await Promise.all(
    to.map((toAddress: any) => contract.emailUserMetadata(emailId, toAddress))
  );

  const ccMetadata: EmailWithUserMetadata[] = await Promise.all(
    cc.map((ccAddress: any) => contract.emailUserMetadata(emailId, ccAddress))
  );

  const metadata: Metadata[] = [fromMetaData, ...toMetadata, ...ccMetadata].map(
    (_metadata: EmailWithUserMetadata) => {
      const { encryptedMessageId, encryptedSymmetricObj, important, deleted, read } = _metadata;
      return {
        encryptedMessageId,
        encryptedSymmetricObj,
        important,
        deleted,
        read,
      };
    }
  );

  return {
    id: BigNumber.from(emailId),
    from,
    to,
    cc,
    createdAt,
    users: [from, ...to, ...cc],
    metadata,
  };
}

task('email-migrate', 'Migrate data to a new contract version')
  .addOptionalParam('oldContractAddress', 'Old contract address')
  .addOptionalParam('newContractAddress', 'New contract address')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const { utils, constants } = ethers;
    const { oldContractAddress, newContractAddress } = args;

    if (!utils.isAddress(oldContractAddress)) {
      throw new Error('Invalid old contract address');
    }

    if (!utils.isAddress(newContractAddress)) {
      throw new Error('Invalid new contract address');
    }

    // get last sent email id
    // get all the migrated email ids
    // one by one get the remainig emails and upload it to new contract

    const contractName = 'PointEmail';

    const oldContract = await ethers.getContractAt(contractName, oldContractAddress);
    const newContract = await ethers.getContractAt(contractName, newContractAddress);

    const lastEmailId = await getLastEmailId(oldContract);
    const migratedEmailIds = await getMigratedEmailIds(newContract);

    console.log(lastEmailId, migratedEmailIds);

    for (let emailId = 1; emailId <= lastEmailId; emailId++) {
      // email already migrated
      if (migratedEmailIds.includes(emailId)) {
        continue;
      }

      const emailData = await getEmailData(oldContract, emailId);

      if (!emailData) {
        continue;
      }

      console.log('migrating', emailId);

      await newContract.addEmailFromMigration(
        emailData.id,
        emailData.from,
        emailData.to,
        emailData.cc,
        emailData.createdAt,
        emailData.users,
        emailData.metadata
      );

      console.log('done');
    }

    console.log('completed');
  });
