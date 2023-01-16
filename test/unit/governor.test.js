const { ethers, deployments, network, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Governor", () => {
      console.log("test start");
      let deployer, member1, member2;
      let governorContract, governanceTokenContract;
      beforeEach(async () => {
        await deployments.fixture(["all"]);
        const accounts = await getNamedAccounts();
        ({ deployer, member1, member2 } = accounts);
        governorContract = await ethers.getContract(
          "DeJournalGovernor",
          deployer
        );
        governanceTokenContract = await ethers.getContract(
          "DeJournalToken",
          deployer
        );
      });
      describe("Constructor", () => {
        it("Correct init members and token contract", async () => {
          const initOwners = await governorContract.getInitOwners();
          assert.equal(initOwners.length, 3);
        });

        it("correct governance token contract address", async () => {
          const governanceTokenAddress =
            await governorContract.getGovernanceToken();
          assert.equal(governanceTokenAddress, governanceTokenContract.address);
        });
      });

      describe("Initialize function", () => {
        it("mints Governance Tokens to the init owners", async () => {
          const owner1 = await governanceTokenContract.ownerOf(1);
          const owner2 = await governanceTokenContract.ownerOf(2);
          const owner3 = await governanceTokenContract.ownerOf(3);
          assert.equal(owner1, deployer);
          assert.equal(owner2, member1);
          assert.equal(owner3, member2);
        });

        it("should revert when trying to initialize owners again", async () => {
          await expect(governorContract.initializeOwners()).to.be.reverted;
        });

        it("should revert if anyone but the governor tries to mint governance token", async () => {
          await expect(governanceTokenContract.mint(member1)).to.be.reverted;
        });
      });
    });
