const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const governanceToken = await deploy("DeJournalToken", {
    contract: "DeJournalToken",
    from: deployer,
    blockConfirmations: 1,
    log: true,
  });
  const governanceTokenContract = await ethers.getContract(
    "DeJournalToken",
    deployer
  );
  log("-----------------------------------------------------------");

  if (!developmentChains.includes(network.name)) {
    // etherscan verify
  }
};

module.exports.tags = ["token", "all"];
