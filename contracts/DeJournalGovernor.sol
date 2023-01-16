// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./token/DeJournalToken.sol";

contract DeJournalGovernor {
    error DeJournalGovernor__AlreadyInit();

    address[3] private s_initOwners;
    bool private s_init = false;
    mapping(address => bool) private s_isOwner;
    DeJournalToken governanceTokenContract;

    constructor(address[3] memory _owners, address _governanceTokenAddress) {
        governanceTokenContract = DeJournalToken(_governanceTokenAddress);
        s_initOwners = _owners;
    }

    /*
    @notice the init function to initialize the founding members of the Journal DAO.
            It can be called only ones. It is called by the deployer, post which the ownership
            of the governance token contract will be transfere to this contract (governor).
    */
    function initializeOwners() public {
        if (s_init) {
            revert DeJournalGovernor__AlreadyInit();
        }
        address[3] memory owners = s_initOwners;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] != address(0)) {
                s_isOwner[owners[i]] = true;
                governanceTokenContract.mint(owners[i]);
            }
        }
        s_init = true;
    }

    // view and pure getter functions
    function getInitOwners() public view returns (address[3] memory) {
        return s_initOwners;
    }

    function getGovernanceToken() public view returns (address) {
        return address(governanceTokenContract);
    }
}
