var util = require('util');
var bitcore = require('bitcore-lib');
var Transaction = bitcore.Transaction;

var log = require('satoshipay-nano-logger')
  .child({component: 'bitcore-notifications'});
var request = require('request');

var ConfigBitcoreNotifier = function(webhookEndpoint) {

  function BitcoreNotifier(options) {
    this.node = options.node;
    this.node.services.bitcoind.on('tx', this.transactionHandler.bind(this));
  }

  BitcoreNotifier.dependencies = ['bitcoind', 'address'];

  // Handlers

  BitcoreNotifier.prototype.transactionHandler = function(txInfo) {
    var tx = new Transaction().fromBuffer(txInfo.buffer);

    log.info(tx, 'Got transaction!');

    request.post(
      webhookEndpoint,
      {json: tx},
      function (err, res, body) {
        if (err) {
          log.error(err);
          return;
        }
        if (res.statusCode === 200) {
          log.info(body, 'Successfully called webhook.');
        } else {
          log.error(res.statusCode, 'Expected status 200');
        }
      }
    );
  };

  // Interface

  BitcoreNotifier.prototype.start = function(callback) {
    setImmediate(callback);
  };

  BitcoreNotifier.prototype.stop = function(callback) {
    setImmediate(callback);
  };

  BitcoreNotifier.prototype.getAPIMethods = function() {
    return [];
  };

  BitcoreNotifier.prototype.getPublishEvents = function() {
    return [];
  };

  return BitcoreNotifier;
};

module.exports = ConfigBitcoreNotifier;
