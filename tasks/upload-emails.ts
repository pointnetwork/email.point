import { BigNumber, Contract, constants } from 'ethers';
import { task } from 'hardhat/config';
import { promises as fs } from 'fs';
import path from 'path';

async function getMigratedEmailIds(contract: Contract) {
  const bloomFilter = contract.filters.EmailMigrated();
  const events = await contract.queryFilter(bloomFilter, 0, 'latest');

  return events.map((event) => {
    return (event?.args?.id as BigNumber).toNumber();
  });
}

task('upload-emails', 'Migrate data to a new contract version')
  .addOptionalParam('contractAddress', 'Old contract address')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const { utils } = ethers;
    const { contractAddress } = args;

    if (!utils.isAddress(contractAddress)) {
      throw new Error('Invalid contract address');
    }

    const contractName = 'PointEmail';

    const contract = await ethers.getContractAt(contractName, contractAddress);

    const migratedEmailIds = await getMigratedEmailIds(contract);

    const emailsFolder = path.resolve(__dirname, '..', 'cache', 'emails');
    const emailsToUpload = await fs.readdir(emailsFolder);

    for (let emailFileName of emailsToUpload) {
      const emailData = JSON.parse(
        (await fs.readFile(path.resolve(emailsFolder, `${emailFileName}`))).toString()
      );

      if (migratedEmailIds.includes(BigNumber.from(emailData.id).toNumber())) {
        console.log('email already migrated');
        continue;
      }

      const tx = await contract.addEmailFromMigration(
        emailData.id,
        emailData.from,
        emailData.to,
        emailData.cc,
        emailData.createdAt,
        emailData.users,
        emailData.metadata
      );

      await tx.wait();

      console.log('done');
    }

    console.log('completed');
  });
