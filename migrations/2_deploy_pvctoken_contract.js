const path = require('path');
const PVCToken = artifacts.require(path.resolve('../contracts/PVCToken.sol'));


module.exports = function(deployer) {
  deployer.deploy(PVCToken, '0xf2499E7d871ccf660778a0D3bcCd03b4B4A3557a');
};