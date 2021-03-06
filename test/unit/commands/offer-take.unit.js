/*
  Unit tests for the offer-take command.
*/

'use strict'

const assert = require('chai').assert
const sinon = require('sinon')
const fs = require('fs').promises

const OfferTake = require('../../../src/commands/offer-take')
const { AliceWallet, BobWallet, OfferTest, OfferMakeTx } = require('../../mocks/avax-offer-mock')
const WalletCreate = require('../../../src/commands/wallet-create')
const walletCreate = new WalletCreate()

const filename = `${__dirname.toString()}/../../../.wallets/test123.json`

describe('offer-make', () => {
  let uut
  let sandbox

  before(async () => {
    await walletCreate.createWallet(filename)
  })
  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    uut = new OfferTake()
    sandbox.stub(uut, 'log').returns(true)
  })
  afterEach(() => {
    sandbox.restore()
  })
  after(async () => {
    await fs.rm(filename)
  })

  describe('#offerTake()', () => {
    it('should exit with error status if the wallet doesnt have any AVAX to send', async () => {
      try {
        const bobWallet = await BobWallet()
        bobWallet.utxos.assets = []

        sandbox
          .stub(uut.walletBalances, 'getBalances')
          .resolves(bobWallet)

        await uut.offerTake(filename, OfferTest.txHex, OfferTest.addrReferences)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(
          err.message,
          'Insufficient funds. You are trying to send AVAX',
          'Expected error message'
        )
      }
    })

    it('should exit with error status if the wallet doesnt have enough AVAX to send', async () => {
      try {
        const bobWallet = await BobWallet()
        bobWallet.utxos.utxoStore = null

        sandbox
          .stub(uut.walletBalances, 'getBalances')
          .resolves(bobWallet)

        await uut.offerTake(filename, OfferTest.txHex, OfferTest.addrReferences)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(
          err.message,
          'Not enough avax in the selected utxo',
          'Expected error message'
        )
      }
    })

    it('should return the transaction hex and the address reference object', async () => {
      try {
        // set up Bobx side of tx
        const bobWallet = await BobWallet()
        const aliceWallet = await AliceWallet()

        sandbox
          .stub(uut.walletBalances, 'getBalances')
          .resolves(bobWallet)

        const res = await uut.offerTake(filename, OfferMakeTx.txHex, OfferMakeTx.addrReferences)

        assert.hasAllKeys(res, ['txHex', 'addrReferences'])
        const references = JSON.parse(res.addrReferences)
        const addresses = Object.values(references)
        assert.equal(addresses[0], aliceWallet.walletInfo.address)
        assert.equal(addresses[1], bobWallet.walletInfo.address)
      } catch (err) {
        console.log(err)
        assert.fail('Unexpected result')
      }
    })

    it('should cover the conditionals that check the remainder avax', async () => {
      try {
        const bobWallet = await BobWallet()
        const aliceWallet = await AliceWallet()

        sandbox
          .stub(uut.walletBalances, 'getBalances')
          .resolves(bobWallet)

        const res = await uut.offerTake(filename, OfferTest.txHex, OfferTest.addrReferences)

        assert.hasAllKeys(res, ['txHex', 'addrReferences'])
        const references = JSON.parse(res.addrReferences)
        const addresses = Object.values(references)
        assert.equal(addresses[0], aliceWallet.walletInfo.address)
        assert.equal(addresses[1], bobWallet.walletInfo.address)
      } catch (err) {
        console.log(err)
        assert.fail('Unexpected result')
      }
    })
  })

  describe('#validateFlags()', () => {
    it('should return true', () => {
      const flags = {
        name: 'test123',
        txHex: OfferMakeTx.txHex,
        referece: OfferMakeTx.addrReferences
      }
      assert.equal(uut.validateFlags(flags), true, 'return true')
    })
    it('should throw error if name is not supplied', () => {
      try {
        const flags = {}
        uut.validateFlags(flags)
      } catch (err) {
        assert.include(
          err.message,
          'You must specify a wallet with the -n flag',
          'Expected error message'
        )
      }
    })
    it('should throw error if the txHex is not supplied', () => {
      try {
        const flags = {
          name: 'test123'
        }
        uut.validateFlags(flags)
      } catch (err) {
        assert.include(
          err.message,
          'You must specify transaction hex with the -h flag',
          'Expected error message'
        )
      }
    })
    it('should throw error if the address referece is not supplied', () => {
      try {
        const flags = {
          name: 'test123',
          txHex: 'someHEx'
        }
        uut.validateFlags(flags)
      } catch (err) {
        assert.include(
          err.message,
          'You must specify the utxos address reference with the -r flag',
          'Expected error message'
        )
      }
    })
  })

  describe('#run()', () => {
    it('should return 0 and display error.message on empty flags', async () => {
      sandbox.stub(uut, 'parse').returns({ flags: {} })

      const result = await uut.run()

      assert.equal(result, 0)
    })

    it('should handle an error without a message', async () => {
      sandbox.stub(uut, 'parse').throws({})

      const result = await uut.run()

      assert.equal(result, 0)
    })

    it('should return 0, if the offerTake method fails', async () => {
      const flags = {
        name: 'test123',
        txHex: OfferMakeTx.txHex,
        referece: OfferMakeTx.addrReferences
      }

      // Mock methods that will be tested else where.
      sandbox
        .stub(uut.walletBalances, 'getBalances')
        .rejects(new Error('Something went terribly wrong'))
      sandbox.stub(uut, 'parse').returns({ flags: flags })

      const result = await uut.run()

      assert.equal(result, 0)
    })

    it('should run the run() function', async () => {
      const bobWallet = await BobWallet()

      const flags = {
        name: 'test123',
        txHex: OfferMakeTx.txHex,
        referece: OfferMakeTx.addrReferences
      }

      // Mock methods that will be tested else where.
      sandbox
        .stub(uut.walletBalances, 'getBalances')
        .resolves(bobWallet)

      sandbox.stub(uut, 'parse').returns({ flags: flags })

      const result = await uut.run()

      assert.isTrue(result)
    })
  })
})
