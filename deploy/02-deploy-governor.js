const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deployer, member1, member2 } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const owners = [deployer, member1, member2];
  const governanceToken = await ethers.getContract("DeJournalToken", deployer);
  const args = [owners, governanceToken.address];

  const governor = await deploy("DeJournalGovernor", {
    contract: "DeJournalGovernor",
    from: deployer,
    args: args,
    blockConfirmations: 1,
    log: true,
    gasLimit: 30000000,
  });

  log(
    "Transfering ownership of DeJournalToken to the DeJournalGovernor contract"
  );

  await governanceToken.transferOwnership(governor.address);
  const newOwner = await governanceToken.owner();
  log(`New Owner: ${newOwner}`);

  log("Initializing owners....");
  const governorContract = await ethers.getContract(
    "DeJournalGovernor",
    deployer
  );
  await governorContract.initializeMembers({
    gasLimit: 30000000,
  });

  log("------------------------------------------------------");

  if (!developmentChains.includes(network.name)) {
    // etherscan verify
  }
};

module.exports.tags = ["governor", "all"];
