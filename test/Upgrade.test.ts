import { expect } from 'chai';
import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, upgrades } from 'hardhat';

describe('upgrade', () => {
  let contract: Contract;

  before(async () => {
    const Factory = await ethers.getContractFactory('PointEmailV0');
    contract = await upgrades.deployProxy(Factory);
    await contract.deployed();

    const FactoryV2 = await ethers.getContractFactory('PointEmail');
    contract = await upgrades.upgradeProxy(contract.address, FactoryV2);
  });

  it('foo', () => {
    expect(true).to.equal(true);
  });
});
