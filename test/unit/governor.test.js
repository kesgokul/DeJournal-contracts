const { ethers, deployments, network, getNamedAccounts } = require("hardhat");
const {
  developmentChains,
  metadataHash,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

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
          const initOwners = await governorContract.getInitMembers();
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
          await expect(governorContract.initializeMembers()).to.be.reverted;
        });

        it("should revert if anyone but the governor tries to mint governance token", async () => {
          await expect(governanceTokenContract.mint(member1)).to.be.reverted;
        });
      });

      describe("Introduce Prospect", () => {
        it("reverts if a non member is calling the contract", async () => {
          const { scholar2 } = await getNamedAccounts();
          const signers = await ethers.getSigners();
          const signer1 = signers[6];
          const govContract = await governorContract.connect(signer1);
          await expect(
            govContract.introduceProspect(scholar2, metadataHash)
          ).to.be.revertedWith("DeJournalGovernor__referrerNotMember");
        });

        it("should intro the prospect the emit the correct event", async () => {
          const { scholar1 } = await getNamedAccounts();
          const tx = await governorContract.introduceProspect(
            scholar1,
            metadataHash
          );
          const txReceipt = await tx.wait(1);
          const prospectId = txReceipt.events[0].args[0];

          const prospectMetadata = await governorContract.getProspectMetadata(
            prospectId
          );

          assert.equal(scholar1, txReceipt.events[0].args[1]);
          assert.equal(metadataHash, prospectMetadata);
        });
      });

      describe("Vote on Prospect", () => {
        let prospectId;
        beforeEach(async () => {
          const { scholar1 } = await getNamedAccounts();
          const tx = await governorContract.introduceProspect(
            scholar1,
            metadataHash
          );
          const txReceipt = await tx.wait(1);
          prospectId = txReceipt.events[0].args[0];
        });
        it("should revert if the voter is not a member", async () => {
          const { scholar2 } = await getNamedAccounts();
          const signers = await ethers.getSigners();
          const signer1 = signers[6];
          const govContract = await governorContract.connect(signer1);

          await expect(
            govContract.voteOnProspect(prospectId, true)
          ).to.be.revertedWith("DeJournalGovernor__referrerNotMember");
        });

        it("should revert is the voting period has expired", async () => {
          await mine(72001);

          const signers = await ethers.getSigners();
          const member = signers[1];
          const govContract = await governorContract.connect(member);

          await expect(
            govContract.voteOnProspect(prospectId, true)
          ).to.be.revertedWith("DeJournalGovernor__prospectVotingNotActive");
        });

        it("should register the vote successfully and emit event", async () => {
          await mine(1);

          const signers = await ethers.getSigners();
          const member = signers[1];
          const govContract = await governorContract.connect(member);

          const tx = await govContract.voteOnProspect(prospectId, true);
          const txReceipt = await tx.wait(1);

          const voteReceipt = await govContract.getProspectReceipt(
            prospectId,
            member.address
          );

          const [forVotes, againstVotes] = await govContract.getProspectVotes(
            prospectId
          );

          assert.equal(
            txReceipt.events[0].args[0].toString(),
            prospectId.toString()
          );
          assert.equal(txReceipt.events[0].args[1], member.address);

          assert.equal(voteReceipt[0], true);
          // console.log(forVotes.toString());
          assert.equal(forVotes.toString(), "1");
          assert.equal(againstVotes.toString(), "0");
        });

        it("should revert if the member has already voted", async () => {
          await mine(1);

          const signers = await ethers.getSigners();
          const member = signers[1];
          const govContract = await governorContract.connect(member);

          const tx = await govContract.voteOnProspect(prospectId, true);
          const txReceipt = await tx.wait(1);

          await expect(
            govContract.voteOnProspect(prospectId, false)
          ).to.be.revertedWith("DeJournalGovernor__alreadyVotedOnProspect");
        });
      });

      describe("Induct member", () => {
        let prospectId;
        beforeEach(async () => {
          const { scholar1 } = await getNamedAccounts();
          const tx = await governorContract.introduceProspect(
            scholar1,
            metadataHash
          );
          const txReceipt = await tx.wait(1);
          prospectId = txReceipt.events[0].args[0];
        });

        it("should revert if the voting period is active", async () => {
          await expect(
            governorContract.inductMember(prospectId)
          ).to.be.revertedWith("DeJournalGovernor__prospectVotingStillActive");
        });

        it("should revert if not enough for votes", async () => {
          const tx = await governorContract.voteOnProspect(prospectId, true);
          await tx.wait(1);
          await mine(72001);

          await expect(
            governorContract.inductMember(prospectId)
          ).to.be.revertedWith("DeJournalGovernor__prospectFailedVoting");
        });

        it("should induct member and emit event if prospect has enough for votes", async () => {
          const tx = await governorContract.voteOnProspect(prospectId, true);
          await tx.wait(1);
          const [deployer, member1, member2, scholar1] =
            await ethers.getSigners();
          const govContract1 = governorContract.connect(member1);
          const govContract2 = governorContract.connect(member2);

          await (await govContract1.voteOnProspect(prospectId, true)).wait(1);
          await (await govContract2.voteOnProspect(prospectId, true)).wait(1);

          await mine(72001);

          const inductTx = await governorContract.inductMember(prospectId);
          const txReceipt = await inductTx.wait(1);

          const newMemberBalance = await governanceTokenContract.balanceOf(
            scholar1.address
          );

          assert.equal(txReceipt.events[1].args[0], scholar1.address);
          assert.equal(newMemberBalance.toString(), "1");
        });
      });
    });
