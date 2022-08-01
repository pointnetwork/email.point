import { BigNumber, Contract, constants } from 'ethers';
import { task } from 'hardhat/config';
import { promises as fs } from 'fs';
import path from 'path';
import { EmailData, EmailWithUserMetadata, Metadata } from './types';

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

task('download-emails', 'Migrate data to a new contract version')
  .addOptionalParam('contractAddress', 'contract')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const { utils } = ethers;
    const { contractAddress } = args;

    if (!utils.isAddress(contractAddress)) {
      throw new Error('Invalid old contract address');
    }

    const contractName = 'PointEmail';

    const contract = await ethers.getContractAt(contractName, contractAddress);
    const lastEmailId = await getLastEmailId(contract);

    const emailsFolder = path.resolve(__dirname, '..', 'cache', 'emails');

    try {
      await fs.mkdir(emailsFolder);
    } catch (error) {}

    for (let emailId = 1; emailId <= lastEmailId; emailId++) {
      const emailPath = path.resolve(emailsFolder, `${emailId}.json`);
      try {
        await fs.open(emailPath, 'r');
        console.log(emailId, 'already saved');
        continue;
      } catch (error) {}

      const emailData = await getEmailData(contract, emailId);

      if (!emailData) {
        console.log('email missing', emailId);
        continue;
      }

      console.log('saving', emailId);

      fs.writeFile(emailPath, JSON.stringify(emailData));

      console.log('done');
    }

    console.log('completed');
  });
