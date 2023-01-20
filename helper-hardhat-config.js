const { ethers } = require("hardhat");

const developmentChains = ["hardhat", "localhost"];
const metadataHash = ethers.utils.id(
  "https://ipfs.io/ipfs/QmPtDKKUcKxpsZUpKx1UiJQHQ5tfuLhZtAeE6c9Gr7jzsS?filename=basicUri.json"
);

module.exports = { developmentChains, metadataHash };
