// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./token/DeJournalToken.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

error DeJournalGovernor__alreadyInit();
error DeJournalGovernor__referrerNotMember();
error DeJournalGovernor__alreadyVotedOnProspect();
error DeJournalGovernor__prospectVotingNotActive();
error DeJournalGovernor__AlreadyMember();
error DeJournalGovernor__prospectVotingStillActive();
error DeJournalGovernor__prospectFailedVoting();

contract DeJournalGovernor {
    using SafeCast for uint256;

    struct Prospect {
        address prospectAddress;
        address referrer;
        bytes32 metadataHash;
        uint256 voteStart;
        uint256 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        bool inducted;
        bool denied;
        mapping(address => ProspectVoteReceipt) receipts;
    }

    struct ProspectVoteReceipt {
        bool hasVoted;
        bool support;
    }

    uint256 private constant PROSPECT_VOTING_DELAY = 1;
    uint private constant PROSPECT_VOTING_PERIOD = 72000;

    address[3] private s_initMembers;
    bool private s_init = false;
    mapping(address => bool) private s_isMember;
    DeJournalToken governanceTokenContract;

    mapping(uint256 => Prospect) private s_prospects;

    event ProspectIntroduced(uint256, address);
    event VotedOnProspect(uint256, address, bool);
    event NewMemberAdded(address, uint256);

    modifier onlyMember() {
        if (!s_isMember[msg.sender]) {
            revert DeJournalGovernor__referrerNotMember();
        }
        _;
    }

    constructor(address[3] memory _members, address _governanceTokenAddress) {
        governanceTokenContract = DeJournalToken(_governanceTokenAddress);
        s_initMembers = _members;
    }

    /** 
    @notice the init function to initialize the founding members of the Journal DAO.
            It can be called only once. It is called by the deployer, post which the ownership
            of the governance token contract will be transfered to this contract (governor).
    */
    function initializeMembers() public {
        if (s_init) {
            revert DeJournalGovernor__alreadyInit();
        }
        address[3] memory owners = s_initMembers;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] != address(0)) {
                _addMember(owners[i]);
            }
        }
        s_init = true;
    }

    /**
     * @notice This function is called by any existing member to add a new member to the DAO
     * Can only be called by an existing member
     * @param _prospectAddress will be the address of the prospect member
     * @param _metadataHash will be the hash of the URI containing the Prospect's academic credentials/docs
     * @return prospectId that is computed using the above mentioned params
     */
    function introduceProspect(
        address _prospectAddress,
        bytes32 _metadataHash
    ) public onlyMember returns (uint256) {
        // require(s_isMember[msg.msg.sender], "Referrer is not a Member");

        uint256 prospectId = uint256(
            keccak256(abi.encode(_prospectAddress, _metadataHash))
        );

        Prospect storage prospect = s_prospects[prospectId];
        prospect.voteStart = block.number + PROSPECT_VOTING_DELAY;
        prospect.deadline = prospect.voteStart + PROSPECT_VOTING_PERIOD;
        prospect.prospectAddress = _prospectAddress;
        prospect.referrer = msg.sender;
        prospect.metadataHash = _metadataHash;

        emit ProspectIntroduced(prospectId, _prospectAddress);
        return prospectId;
    }

    /**
     * @notice this function will be called by any existing member to cast their vote on any pending prospect
     * the function will check if the voting period is active
     * @param _prospectId - the ID of the prospect returned from the introduceProspect() function.
     * @param _support - whether the msg.sender supports the prospect or not
     */
    function voteOnProspect(
        uint256 _prospectId,
        bool _support
    ) public onlyMember {
        if (
            block.number >= s_prospects[_prospectId].deadline ||
            block.number < s_prospects[_prospectId].voteStart
        ) {
            revert DeJournalGovernor__prospectVotingNotActive();
        }

        if (s_prospects[_prospectId].receipts[msg.sender].hasVoted) {
            revert DeJournalGovernor__alreadyVotedOnProspect();
        }

        if (_support) {
            s_prospects[_prospectId].receipts[msg.sender].hasVoted = true;
            s_prospects[_prospectId].receipts[msg.sender].support = true;

            s_prospects[_prospectId].forVotes += 1;
        }

        if (!_support) {
            s_prospects[_prospectId].receipts[msg.sender].hasVoted = true;
            s_prospects[_prospectId].receipts[msg.sender].support = false;

            s_prospects[_prospectId].againstVotes + 1;
        }

        emit VotedOnProspect(_prospectId, msg.sender, _support);
    }

    function inductMember(
        uint256 _prospectId
    ) public onlyMember returns (uint256) {
        if (block.number < s_prospects[_prospectId].deadline) {
            revert DeJournalGovernor__prospectVotingStillActive();
        }

        if (
            s_prospects[_prospectId].forVotes < 3 ||
            s_prospects[_prospectId].againstVotes >
            s_prospects[_prospectId].forVotes
        ) {
            revert DeJournalGovernor__prospectFailedVoting();
        }

        _addMember(s_prospects[_prospectId].prospectAddress);
        return _prospectId;
    }

    function _addMember(address _member) internal {
        if (s_isMember[_member]) {
            revert DeJournalGovernor__AlreadyMember();
        }
        s_isMember[_member] = true;
        uint256 tokenId = governanceTokenContract.mint(_member);

        emit NewMemberAdded(_member, tokenId);
    }

    // view and pure getter functions
    function getInitMembers() public view returns (address[3] memory) {
        return s_initMembers;
    }

    function getGovernanceToken() public view returns (address) {
        return address(governanceTokenContract);
    }

    function getProspectMetadata(
        uint256 _prospectId
    ) public view returns (bytes32) {
        return s_prospects[_prospectId].metadataHash;
    }

    function getProspectReceipt(
        uint256 _prospectId,
        address _voter
    ) public view returns (ProspectVoteReceipt memory) {
        return s_prospects[_prospectId].receipts[_voter];
    }

    function getProspectVotes(
        uint256 _prospectId
    ) public view returns (uint256, uint256) {
        return (
            s_prospects[_prospectId].forVotes,
            s_prospects[_prospectId].againstVotes
        );
    }
}
