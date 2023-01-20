//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DeJournalToken is ERC721, Ownable {
    uint256 private s_counter;

    constructor() ERC721("DeJournal Governance Token", "DeJou") {
        s_counter = 0;
    }

    function mint(address to) public onlyOwner returns (uint256) {
        s_counter++;
        _safeMint(to, s_counter);
        return s_counter;
    }
}
