# Bitcore Notifications Service

Service that can be plugged into [bitcore-node](https://github.com/bitpay/bitcore-node) and calls webhooks on certain events.

## Supported events:

### New transaction broadcasted

The endpoints are going to be called with the `insight-api` tx json schema.

## Usage

```javascript
var notifications = require('bitcore-notifications');

// Add bitcore notifications to the list of bitcore-node services
var configuration = {
  // Other options
  services: [
    // Other services...
    {
      name: 'bitcore-notifications',
      module: notifications,
      config: {
        webhooks: ['http://host.com/endpoint']
      }
    }
  ]
};

var node = new Node(configuration);
node.start(function (err) {
  // ...
};

```

### Service Dependencies

* bitcoind
* address
* insight-api
