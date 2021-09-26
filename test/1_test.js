const expect = require('chai').expect;
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const PVCToken = artifacts.require('PVCToken');

const TOKEN_NAME = 'PryvateCoin';
const TOKEN_SYMBOL = 'PVC';
const TOKEN_DECIMALS = 18;
const TOKEN_SUPPLY = '50000000';

let PRIMARY_ADDRESS;
let SECONDARY_ADDRESS;
let VESTING_ADDRESSES = [];
const x0 = '0x0000000000000000000000000000000000000000';
const STANDARD_AMOUNT = '8';
const VESTING_AMOUNTS = new Array(8).fill(Number(STANDARD_AMOUNT));

let PVCTokenContractAddress;

contract('PVCToken', accounts => {
  PRIMARY_ADDRESS = accounts[0];
  SECONDARY_ADDRESS = accounts[1];
  VESTING_ADDRESSES = [accounts[2], accounts[3], accounts[4], accounts[5], accounts[6], accounts[7], accounts[8], accounts[9]];
  describe('Check that the PVCToken contract deploys correctly', () => {
    it('Should create a new contract', () => {
      return PVCToken.new(PRIMARY_ADDRESS).then(instance => {
        PVCTokenContract = instance;
        PVCTokenContractAddress = instance.address;
      });
    });
  });
  describe('Check that the token name is correct', () => {
    it('Should be "' + TOKEN_NAME + '"', () => {
      return PVCTokenContract.name().then(name => {
        expect(name).to.be.equal(TOKEN_NAME);
      });
    });
  });
  describe('Check that the token symbol is correct', () => {
    it('Should be "' + TOKEN_SYMBOL + '"', () => {
      return PVCTokenContract.symbol().then(symbol => {
        expect(symbol).to.be.equal(TOKEN_SYMBOL);
      });
    });
  });
  describe('Check that the decimal amount is correct', () => {
    it('Should be ' + TOKEN_DECIMALS, () => {
      return PVCTokenContract.decimals().then(decimals => {
        expect(BigNumber(decimals).toNumber()).to.be.equal(TOKEN_DECIMALS);
      });
    });
  });
  describe('Check that the total supply is correct', () => {
    it('Should be ' + TOKEN_SUPPLY, () => {
      return PVCTokenContract.totalSupply().then(totalSupply => {
        expect(Web3.utils.fromWei(totalSupply)).to.be.equal(TOKEN_SUPPLY);
      });
    });
  });
  describe('Check that the contract owner address is correct', () => {
    it('Should be ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.owner().then(address => {
        expect(address.toString()).to.be.equal(PRIMARY_ADDRESS);
      });
    });
  });
  describe('Check that the contract creator has been issued 50,000,000 PVC', () => {
    it('Should have issued 50,000,000 PVC to the contract creator', () => {
      return PVCTokenContract.balanceOf(PRIMARY_ADDRESS).then(balance => {
        expect(Web3.utils.fromWei(balance)).to.be.equal('50000000');
      });
    });
  });
  describe('Check that the transfer function works', () => {
    it('Should transfer ' + STANDARD_AMOUNT + ' PVC to ' + SECONDARY_ADDRESS, () => {
      return PVCTokenContract.transfer(SECONDARY_ADDRESS, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(Web3.utils.fromWei(transaction.receipt.logs[0].args.value)).to.be.equal(STANDARD_AMOUNT);
      });
    });
  });
  describe('Check that the contract can transfer ownership', () => {
    it('Should transfer ownership from ' + PRIMARY_ADDRESS + ' to ' + SECONDARY_ADDRESS, () => {
      return PVCTokenContract.transferOwnership(SECONDARY_ADDRESS).then(owner => {
        return PVCTokenContract.owner().then(owner => {
          expect(owner).to.be.equal(SECONDARY_ADDRESS);
          // We must transfer ownership back to PRIMARY_ADDRESS before our
          // next tests which rely on PRIMARY_ADDRESS being the owner.
          PVCTokenContract.transferOwnership(PRIMARY_ADDRESS, { from: SECONDARY_ADDRESS });
        });
      });
    });
  });
  describe('Check that the contract can vest the team', () => {
    it('Should transfer ' + STANDARD_AMOUNT + ' PVC to each of 8 addresses', () => {
      return PVCTokenContract.vest(VESTING_ADDRESSES, VESTING_AMOUNTS).then(transaction => {
        const allAddressesFunded = VESTING_ADDRESSES.every(address => {
          return PVCTokenContract.balanceOf(address).then(balance => {
            return Web3.utils.fromWei(balance).toString() === STANDARD_AMOUNT;
          });
        });
        expect(allAddressesFunded).to.be.equal(true);
      });
    });
  });
  describe('Check that a wallet owner can approve an allowance of their PVC to be spent by another address of choice', () => {
    it('Should approve ' + STANDARD_AMOUNT + ' PVC from ' + PRIMARY_ADDRESS + ' to be spent by ' + SECONDARY_ADDRESS, () => {
      return PVCTokenContract.approve(SECONDARY_ADDRESS, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        return PVCTokenContract.allowance(PRIMARY_ADDRESS, SECONDARY_ADDRESS).then(allowance => {
          expect(Web3.utils.fromWei(allowance)).to.be.equal(STANDARD_AMOUNT);
        });
      });
    });
  });
  describe('Check that PVC can be transferred on behalf of an approval', () => {
    it('Should transfer ' + STANDARD_AMOUNT + ' PVC from ' + PRIMARY_ADDRESS + ' to ' + SECONDARY_ADDRESS, () => {
      return PVCTokenContract.transferFrom(PRIMARY_ADDRESS, SECONDARY_ADDRESS, Web3.utils.toWei(STANDARD_AMOUNT), { from: SECONDARY_ADDRESS }).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(true);
        return PVCTokenContract.balanceOf(SECONDARY_ADDRESS).then(balance => {
          expect(Web3.utils.fromWei(balance)).to.be.equal((Number(STANDARD_AMOUNT) * 2).toString());
        });
      });
    });
  });
  describe('Check that PVC can be burned', () => {
    it('Should burn ' + STANDARD_AMOUNT + ' PVC, therefore reducing the totalSupply by ' + STANDARD_AMOUNT + ' as well', () => {
      return PVCTokenContract.burn(Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(true);
        return PVCTokenContract.totalSupply().then(totalSupply => {
          expect(Web3.utils.fromWei(totalSupply)).to.be.equal((Number(TOKEN_SUPPLY) - Number(STANDARD_AMOUNT)).toString());
        });
      });
    });
  });
  describe('Check that PVC cannot be transfered to self via the transfer function', () => {
    it('Should fail transfering ' + STANDARD_AMOUNT + ' PVC to ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.transfer(PRIMARY_ADDRESS, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot transfer to self')).to.be.equal(true);
      });
    });
  });
  describe('Check that PVC cannot be transfered to the contract via the transfer function', () => {
    it('Should fail transfering ' + STANDARD_AMOUNT + ' PVC to the contract address', () => {
      return PVCTokenContract.transfer(PVCTokenContractAddress, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot transfer to Contract')).to.be.equal(true);
      });
    });
  });
  describe('Check that PVC cannot be transfered to 0x0 via the transfer function', () => {
    it('Should fail transfering ' + STANDARD_AMOUNT + ' PVC to ' + x0, () => {
      return PVCTokenContract.transfer(x0, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot transfer to 0x0')).to.be.equal(true);
      });
    });
  });
  describe('Check that PVC cannot be transfered from self via the transferFrom function', () => {
    it('Should fail transfering ' + STANDARD_AMOUNT + ' PVC to ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.transferFrom(SECONDARY_ADDRESS, PRIMARY_ADDRESS, Web3.utils.toWei(STANDARD_AMOUNT), { from: SECONDARY_ADDRESS }).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot transfer from self, use transfer function instead')).to.be.equal(true);
      });
    });
  });
  describe('Check that PVC cannot be transfered to the contract via the transferFrom function', () => {
    it('Should fail transfering ' + STANDARD_AMOUNT + ' PVC from ' + SECONDARY_ADDRESS + ' to the contract address', () => {
      return PVCTokenContract.transferFrom(SECONDARY_ADDRESS, PVCTokenContractAddress, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot transfer from or to Contract')).to.be.equal(true);
      });
    });
  });
  describe('Check that PVC cannot be transfered to 0x0 via the transferFrom function', () => {
    it('Should fail transfering ' + STANDARD_AMOUNT + ' PVC to ' + x0, () => {
      return PVCTokenContract.transferFrom(SECONDARY_ADDRESS, x0, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot transfer to 0x0'));
      });
    });
  });
  describe('Check that self cannot be approved an allowance', () => {
    it('Should fail approving ' + STANDARD_AMOUNT + ' PVC allowance from ' + PRIMARY_ADDRESS + ' to ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.approve(PRIMARY_ADDRESS, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot approve an allowance to self')).to.be.equal(true);
      });
    });
  });
  describe('Check that the contract cannot be approved an allowance', () => {
    it('Should fail approving ' + STANDARD_AMOUNT + ' PVC allowance from ' + SECONDARY_ADDRESS + ' to the contract address', () => {
      return PVCTokenContract.approve(PVCTokenContractAddress, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot approve contract an allowance')).to.be.equal(true);
      });
    });
  });
  describe('Check that 0x0 cannot be approved an allowance', () => {
    it('Should fail approving ' + STANDARD_AMOUNT + ' PVC allowance from ' + PRIMARY_ADDRESS + ' to ' + x0, () => {
      return PVCTokenContract.approve(x0, Web3.utils.toWei(STANDARD_AMOUNT)).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Cannot approve 0x0 an allowance')).to.be.equal(true);
      });
    });
  });
  describe('Check that the lockup amount of a vested address is correct', () => {
    it('Should detect a lockup amount of ' + STANDARD_AMOUNT + ' PVC for ' + accounts[3], () => {
      return PVCTokenContract.lockupAmountOf(accounts[3]).then(amount => {
        expect(Web3.utils.fromWei(amount).toString()).to.be.equal(STANDARD_AMOUNT);
      });
    });
  });
  describe('Check that > 55% of locked amount can be transferred before the lockup period begins', () => {
    it('Should transfer ' + (Number(STANDARD_AMOUNT) * 60 / 100).toString() + ' PVC (60%) from ' + accounts[3] + ' to ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.balanceOf(accounts[3]).then(balance => {
        return PVCTokenContract.transfer(PRIMARY_ADDRESS, Web3.utils.toWei((Number(STANDARD_AMOUNT) * 60 / 100).toString()), { from: accounts[3] }).then(transaction => {
          expect(transaction.receipt.status).to.be.equal(true);
        }).catch(error => {
          expect(error.message.includes('Must maintain correct % of PVC during lockup periods')).to.be.equal(false);
        });
      });
    });
  });
  describe('Check that we can activate the lockup period', () => {
    it('Should initiate the lockup period', () => {
      return PVCTokenContract.initiateLockup().then(transaction => {
        return PVCTokenContract.lockupActive().then(isActive => {
          expect(isActive).to.be.equal(true);
        });
      });
    });
  });
  describe('Check that > 5% of locked amount cannot be transferred during lockup period #1', () => {
    it('Should fail transfering ' + (Number(STANDARD_AMOUNT) * 10 / 100).toString() + ' PVC (10%) from ' + accounts[3] + ' to ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.transfer(PRIMARY_ADDRESS, Web3.utils.toWei((Number(STANDARD_AMOUNT) * 10 / 100).toString()), { from: accounts[3] }).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(false);
      }).catch(error => {
        expect(error.message.includes('Must maintain correct % of PVC during lockup periods')).to.be.equal(true);
      });
    });
  });
  describe('Check that <= 5% of locked amount can be transferred during lockup period #1', () => {
    it('Should transfer ' + (Number(STANDARD_AMOUNT) * 5 / 100).toString() + ' PVC from ' + accounts[4] + ' to ' + PRIMARY_ADDRESS, () => {
      return PVCTokenContract.transfer(PRIMARY_ADDRESS, Web3.utils.toWei((Number(STANDARD_AMOUNT) * 5 / 100).toString()), { from: accounts[4] }).then(transaction => {
        expect(transaction.receipt.status).to.be.equal(true);
      }).catch(error => {
        expect(error.message.includes('Must maintain correct % of PVC during lockup periods')).to.be.equal(false);
      });
    });
  });
});