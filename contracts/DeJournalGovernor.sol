// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./token/DeJournalToken.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

error DeJournalGovernor__alreadyInit();
error DeJournalGovernor__referrerNotMember();

contract DeJournalGovernor {
    using SafeCast for uint256;
    uint256 private constant PROSPECT_VOTING_DELAY = 1;
    uint private constant PROSPECT_VOTING_PERIOD = 72000;

    address[3] private s_initMembers;
    bool private s_init = false;
    mapping(address => bool) private s_isMember;
    DeJournalToken governanceTokenContract;

    struct Prospect {
        address prospectAddress;
        address referrer;
        bytes32 metadataHash;
        uint256 voteStart;
        uint256 deadline;
        bool inducted;
        bool denied;
    }

    mapping(uint256 => Prospect) private _prospects;

    constructor(address[3] memory _members, address _governanceTokenAddress) {
        governanceTokenContract = DeJournalToken(_governanceTokenAddress);
        s_initMembers = _members;
    }

    /*
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
                s_isMember[owners[i]] = true;
                governanceTokenContract.mint(owners[i]);
            }
        }
        s_init = true;
    }

    function introduceProspect(
        address _prospectAddress,
        bytes32 _metadataHash
    ) public returns (uint256) {
        // require(s_isMember[msg.msg.sender], "Referrer is not a Member");
        if (!s_isMember[msg.sender]) {
            revert DeJournalGovernor__referrerNotMember();
        }

        uint256 prospectId = uint256(
            keccak256(abi.encode(_prospectAddress, _metadataHash))
        );

        Prospect storage prospect = _prospects[prospectId];
        prospect.voteStart = block.number + PROSPECT_VOTING_DELAY;
        prospect.deadline = prospect.voteStart + PROSPECT_VOTING_PERIOD;
        prospect.prospectAddress = _prospectAddress;
        prospect.referrer = msg.sender;

        return prospectId;
    }

    // view and pure getter functions
    function getInitOwners() public view returns (address[3] memory) {
        return s_initMembers;
    }

    function getGovernanceToken() public view returns (address) {
        return address(governanceTokenContract);
    }
}
