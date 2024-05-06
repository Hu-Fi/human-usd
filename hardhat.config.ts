import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-dependency-compiler";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";

dotenv.config();

task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    // eslint-disable-next-line no-console
    console.log(account.address);
  }
});

task(
  "balances",
  "Prints the list of accounts and their balances",
  async (_, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      // eslint-disable-next-line no-console
      console.log(
        account.address +
          " " +
          (await hre.ethers.provider.getBalance(account.address))
      );
    }
  }
);

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 10,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: `http://127.0.0.1:${process.env.RPC_PORT || "8545"}`,
    },
    hardhat: {
      forking: process.env.FORKING_URL
        ? {
            url: process.env.FORKING_URL,
          }
        : undefined,
      chainId: 1338,
      initialBaseFeePerGas: 0,
    },
    mainnet: {
      chainId: 1,
      url: process.env.RPC_URL_MAINNET || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.RPC_URL_SEPOLIA || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    polygon: {
      chainId: 137,
      url: process.env.RPC_URL_POLYGON || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    polygonAmoy: {
      chainId: 80002,
      url: process.env.RPC_URL_POLYGON_AMOY || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    bsc: {
      chainId: 56,
      url: process.env.RPC_URL_BSC || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    bscTestnet: {
      chainId: 97,
      url: process.env.RPC_URL_BSC_TESTNET || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      timeout: 2000000,
    },
    moonbeam: {
      chainId: 1284,
      timeout: 2000000,
      url: process.env.RPC_URL_MOONBEAM || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    moonbaseAlpha: {
      chainId: 1287,
      timeout: 2000000,
      url: process.env.RPC_URL_MOONBASE_ALPHA || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avalanche: {
      chainId: 43114,
      timeout: 2000000,
      url: process.env.RPC_URL_AVALANCHE || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avalancheFujiTestnet: {
      chainId: 43113,
      timeout: 2000000,
      url: process.env.RPC_URL_FUJI || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    skale: {
      chainId: 1273227453,
      timeout: 2000000,
      url: process.env.RPC_URL_SKALE || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    celo: {
      chainId: 42220,
      timeout: 2000000,
      url: process.env.RPC_URL_CELO || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    alfajores: {
      chainId: 44787,
      timeout: 2000000,
      url: process.env.RPC_URL_CELO_ALFAJORES || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
    strict: true,
    only: [],
    except: [],
  },
  abiExporter: [
    {
      path: "./abis",
      runOnCompile: true,
      clear: true,
      flat: true,
      only: ["HumanUSD", "CampaignManager"],
      spacing: 2,
      format: "json",
    },
  ],
  etherscan: {
    apiKey: {
      // For Mainnet, Goerli
      mainnet: process.env.API_KEY_ETHERSCAN || "",
      sepolia: process.env.API_KEY_ETHERSCAN || "",
      polygon: process.env.API_KEY_POLYGONSCAN || "",
      polygonAmoy: process.env.API_KEY_POLYGONSCAN || "",
      bsc: process.env.API_KEY_BSC || "",
      bscTestnet: process.env.API_KEY_BSC || "",
      moonbeam: process.env.API_KEY_MOONSCAN || "",
      moonbaseAlpha: process.env.API_KEY_MOONSCAN || "",
      skale: process.env.API_KEY_SKALE || "",
      avalanche: process.env.API_KEY_AVALANCHE || "",
      avalancheFujiTestnet: process.env.API_KEY_AVALANCHE || "",
      celo: process.env.API_KEY_CELOSCAN || "",
      alfajores: process.env.API_KEY_CELOSCAN || "",
    },
    customChains: [
      {
        network: "skale",
        chainId: 1273227453,
        urls: {
          apiURL: process.env.SKALE_BROWSER_API_URL || "",
          browserURL: process.env.SKALE_BROWSER_URL || "",
        },
      },
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  mocha: {
    timeout: 200000,
  },
  dependencyCompiler: {
    paths: [
      "@human-protocol/core/contracts/HMToken.sol",
      "@human-protocol/core/contracts/Escrow.sol",
      "@human-protocol/core/contracts/EscrowFactory.sol",
      "@human-protocol/core/contracts/Staking.sol",
    ],
  },
};

export default config;
