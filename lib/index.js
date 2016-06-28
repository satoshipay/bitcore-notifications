'use strict'
var bitcore = require('bitcore-lib')
var Transaction = bitcore.Transaction

var async = require('async')

var log = require('@satoshipay/nano-logger')
  .child({component: 'bitcore-notifications'})
var request = require('request')




function BitcoreNotifier (options) {
  this.node = options.node
  this.webhooks = options.webhooks
  this.webhookQueue = new WebHookQueue(this.webhooks)
  this.webhookQueue = () => {
    lob.debug('All webhooks in queue processed')
  }
  this.transactionQueue = new TransactionQueue(this.node, this.webhookQueue)
  this.transactionQueue.drain = () => {
    log.debug('All transactions in queue processed')
  }
}

BitcoreNotifier.dependencies = ['bitcoind', 'insight-api']

// Handlers

var WebHookQueue = (webhooks) => {
  return async.queue((transactionObject, callback) => {
    var transaction = transactionObject
    async.map(webhooks, (webhook, callback) => {
      request.post(
        webhook,
        {json: transaction},
        function (err, webhookRes, webhookBody) {
          if (err) {
            return callback(err)
          }
          if (webhookRes.statusCode !== 200) {
            log.error({
              webhook: webhook,
              transaction: transaction
            }, 'Webhook failed')
            return callback(new Error('Server returned non success'))
          }
          log.debug({
            body: webhookBody,
            hook: webhook
          }, 'Successfully called.')
          callback()
        }
      )
    }, callback)
  },16)
}

var TransactionQueue = (bitcoreNode, webhookQueue) => {
  return async.queue((transactionBuffer, callback) => {
    var tx = new Transaction().fromBuffer(transactionBuffer)
    log.trace({
      txid: tx.hash
    }, 'Handling transaction')
    bitcoreNode.services.bitcoind.getDetailedTransaction(tx.hash, function (err, transaction) {
      if (err) {
        log.error({
          txid: tx.hash
        }, 'Error getting detailed Transaction from Bitcore node.')
        return callback(err)
      }
      log.debug({
        txid: transaction.txid
      }, 'Got insight api transformed tx')
        webhookQueue.push({insightTx: transaction, webhook: webhook}, function (err) {
          if (err) {
            log.error({
              error: err
            }, 'Failed to process webhook')
          }
        })
      return callback()
    })
  }, 8)
}

// Interface

BitcoreNotifier.prototype.start = function (callback) {
  this.node.services.bitcoind.on('tx', (transactionBuffer) => {
    this.transactionQueue.push(transactionBuffer, (err) => {
      if (err) {
        log.error(err)
      }
    })
  })
  log.info('BitcoreNotifier started.')
  setImmediate(callback)
}

BitcoreNotifier.prototype.stop = function (callback) {
  setImmediate(callback)
}

BitcoreNotifier.prototype.getAPIMethods = function () {
  return []
}

BitcoreNotifier.prototype.getPublishEvents = function () {
  return []
}

module.exports = BitcoreNotifier
