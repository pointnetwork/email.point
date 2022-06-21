import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, upgrades } from 'hardhat';

const handle = 'email';

const commPublicKeyPart1 = '0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce';
const commPublicKeyPart2 = '0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb';

describe('Testing contract upgradability', () => {
  let emailContract: Contract;
  let identityContract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let users: SignerWithAddress[];
  let emailFactory: ContractFactory;
  let identityFactory: ContractFactory;

  before(async () => {
    [owner, user1, user2, ...users] = await ethers.getSigners();

    [emailFactory, identityFactory] = await Promise.all([
      ethers.getContractFactory('PointEmail'),
      ethers.getContractFactory('Identity'),
    ]);

    identityContract = await upgrades.deployProxy(identityFactory, [], { kind: 'uups' });
    await identityContract.deployed();

    emailContract = await upgrades.deployProxy(emailFactory, [identityContract.address, handle], {
      kind: 'uups',
    });
    await emailContract.deployed();

    let tx = await identityContract.setDevMode(true);
    await tx.wait();
    tx = await identityContract.register(
      handle,
      owner.address,
      commPublicKeyPart1,
      commPublicKeyPart2
    );
    await tx.wait();
  });

  it('Should upgrade the proxy by a deployer', async () => {
    const tx = await identityContract.addIdentityDeployer(handle, user1.address);
    await tx.wait();
    await upgrades.upgradeProxy(emailContract.address, emailFactory.connect(user1));
  });

  it('Should not upgrade the proxy by a non-deployer', async () => {
    await expect(
      upgrades.upgradeProxy(emailContract.address, emailFactory.connect(user2))
    ).to.be.revertedWith('Not a deployer');
  });
});
