/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("@nomiclabs/hardhat-waffle");
require("ethereum-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
  defalutNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    member1: {
      default: 1,
    },
    member2: {
      default: 2,
    },
    scholar1: {
      default: 3,
    },
    scholar2: {
      default: 4,
    },
    scholar3: {
      default: 5,
    },
  },
  mocha: {
    timeout: 300000, // 300 sec
  },
};
