import { config } from 'dotenv';
config();

import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-watcher';
import '@openzeppelin/hardhat-upgrades';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { hdkey } from 'ethereumjs-wallet';
import { mnemonicToSeedSync } from 'bip39';

import './tasks/email-migrate';
import './tasks/download-emails';
import './tasks/upload-emails';

const keystorePath = `${os.homedir()}/.point/keystore/key.json`;

const networks: Record<string, any> = {
  hardhat: {
    initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
    forking: {
      enabled: !!process.env.USE_FORK,
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      blockNumber: 13698020,
    },
  },

  rinkeby: {
    url: process.env.RINKEBY_URL || '',
    accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
  },
};

try {
  if (fs.existsSync(keystorePath)) {
    const keystore: any = JSON.parse(
      fs.readFileSync(`${os.homedir()}/.point/keystore/key.json`).toString()
    );

    const wallet = hdkey.fromMasterSeed(mnemonicToSeedSync(keystore.phrase)).getWallet();
    const privateKey = wallet.getPrivateKey().toString('hex');

    // const wallet = ethers.Wallet.fromMnemonic(keystore.phrase);

    networks.ynet = {
      url: 'http://ynet.point.space:44444',
      accounts: [privateKey],
    };
  }
} catch (err) {}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },

  networks,

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    gasPrice: process.env.GAS_PRICE,
    coinmarketcap: process.env.CMC_KEY,
    currency: 'USD',
    outputFile: process.env.TO_FILE ? path.resolve(__dirname, 'gasReporterOutput.json') : undefined,
  },

  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts'],
      verbose: true,
    },

    test: {
      tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
      files: ['./test/**/*'],
      verbose: true,
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
