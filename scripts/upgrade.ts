import { ethers, upgrades } from 'hardhat';

async function main() {
  const Factory = await ethers.getContractFactory('PointEmail');
  const contract = await upgrades.deployProxy(Factory);
  await contract.deployed();

  // Upgrading
  const FactoryV2 = await ethers.getContractFactory('PointEmailV2');
  const upgraded = await upgrades.upgradeProxy(contract.address, FactoryV2);
}

main();
