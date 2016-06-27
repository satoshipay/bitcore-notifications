var bitcore = require('bitcore-lib');
var Transaction = bitcore.Transaction;

var log = require('@satoshipay/nano-logger')
  .child({component: 'bitcore-notifications'});
var request = require('request');

function BitcoreNotifier(options) {
  this.node = options.node;
  this.webhooks = options.webhooks;
}

BitcoreNotifier.dependencies = ['bitcoind', 'insight-api'];

var processWebhook = function (insightTx, webhook, callback) {
  request.post(
    webhook,
    {json: insightTx},
    function (err, webhookRes, webhookBody) {
      if (err) {
        return callback(err);
      }
      if (webhookRes.statusCode !== 200) {
        return callback(new Error('Server returned non success'));
      }
      log.debug({
        body: webhookBody,
        hook: webhook
      }, 'Successfully called.');
      callback();
    }
  );
};

// Handlers

BitcoreNotifier.prototype.transactionHandler = function (transactionBuffer) {
  var self = this;
  var tx = new Transaction().fromBuffer(transactionBuffer);
  log.trace({
    txid: tx.hash
  }, 'Handling transaction');
  node.services.bitcoind.getDetailedTransaction(tx.hash, function(err, transaction) {
    if (err) {
      return log.error({
        txid: tx.hash
      }, 'Error getting detailed Transaction from Bitcore node.');
    }
    log.debug({
      txid: transaction.txid
    }, 'Got insight api transformed tx');
    self.webhooks.forEach(function (webhook) {
      processWebhook(transaction, webhook, function (err) {
        if (err) {
          log.error({
            error: err
          }, 'Failed to process webhook');
        }
      });
    });
  });
};

// Interface

BitcoreNotifier.prototype.start = function (callback) {
  this.node.services.bitcoind.on('tx', this.transactionHandler.bind(this));
  log.info('BitcoreNotifier started.');
  setImmediate(callback);
};

BitcoreNotifier.prototype.stop = function (callback) {
  setImmediate(callback);
};

BitcoreNotifier.prototype.getAPIMethods = function () {
  return [];
};

BitcoreNotifier.prototype.getPublishEvents = function () {
  return [];
};

module.exports = BitcoreNotifier;
