var util = require('util');
var async = require('async');
var bitcore = require('bitcore-lib');
var Transaction = bitcore.Transaction;

var log = require('satoshipay-nano-logger')
  .child({component: 'bitcore-notifications'});
var request = require('request');

function BitcoreNotifier(options) {
  this.node = options.node;
  this.webhooks = options.webhooks;
  this.node.services.bitcoind.on('tx', this.transactionHandler.bind(this));
  log.info('BitcoreNotifier started.');
}

BitcoreNotifier.dependencies = ['bitcoind', 'address', 'insight-api'];


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
        log.info({
          body: webhookBody,
          hook: webhook
        }, 'Successfully called.');
        callback();
      }
    );
  };
// Handlers

BitcoreNotifier.prototype.transactionHandler = function(txInfo) {
  var self = this;
  var tx = new Transaction().fromBuffer(txInfo.buffer);
  log.trace({
    hash: tx.hash
  }, 'Handling transaction');


  log.trace(this.node.port);
  request.get(
    'http://localhost:' + this.node.port + '/insight-api/tx/' + tx.hash,
    function (err, res, body) {
      if (err) {
        log.error(err);
        return;
      }
      if (res.statusCode === 200) {
        var insightTx = JSON.parse(body);
        log.debug(insightTx.txid, 'Got insight api transformed tx');
        self.webhooks.each(function(webhook) {
          processWebhook(insightTx, webhook, function(err) {
            if (err) {
              log.error({
                error: err
              }, 'Failed to process webhook');
            }
          });
        });
      } else {
        log.error(res.statusCode,
                  'Error calling insight-api. Expected status 200');
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

module.exports = BitcoreNotifier;
