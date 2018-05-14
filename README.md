## Synopsis

**Fanap's POD** Async service (DIRANA)

## Code Example

Create an Javascript file e.x `index.js` and put following code in it:

```javascript
var Async = require('podasync');

/**
* socketAddress: Socket Server Address
* serverName: Chat Server Name
*/
var params = {
  socketAddress: "ws://172.16.110.235:8003/ws",
  serverName: "oauth-wire"
};

var asyncClient = new Async(params);

/**
* Write your code inside asyncReady() function
*/
asyncClient.asyncReady(function() {

/**
* A Custom Message To be Send Through DIRANA
*/
  var customMessage = {
    type: 3,
    content: {
      receivers: ["receiver1", "receiver2", "..."],
      content: "Hello Buddy!"
    }
  };

/**
* Sending Message
*/
  asyncClient.send(customMessage);

/**
* Listening to responses came from DIRANA
*/
  asyncClient.on("message", function(msg, ack) {
    console.log(msg);
  });
});
```

To execute your code simple run following command in command line

    cd /root_of_your_project
    node index.js

## Motivation

This module helps you to easily connect POD chat service.

## Installation

```javascript
npm install podasync --save
npm install
```

## API Reference

[API Docs from POD](http://www.fanapium.com)

## Tests

```javascript
npm test
```

## Contributors

You can send me your thoughts about making this repo great :)
[Email](masoudmanson@gmail.com)

## License

Under MIT License.
