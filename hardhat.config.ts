import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-dependency-compiler";
import "@openzeppelin/hardhat-upgrades";

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
