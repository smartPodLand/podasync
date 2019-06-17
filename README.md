## Synopsis

**Fanap's POD** Async service (DIRANA)

## Code Example

First you have to require PodAsync in your project.

```javascript
var Async = require('podasync');
```

To be able to connect to async server, you should set some parameters. `Websockets`, `ActiveMQ` and `MQTT` protocols are currently supported.

### Websocket protocol parameters

```javascript
var params = {
  socketAddress: "ws://chat-sandbox.pod.land/ws",
  serverName: "chat-server",
  reconnectOnClose: true,
  connectionCheckTimeout: 10000,
  asyncLogging: {
    onFunction: true,
    onMessageReceive: true,
    onMessageSend: true
  }
};
```

### ActiveMQ protocol parameters

```javascript
var params = {
  protocol: "queue",
  queueHost: "172.16.0.248",
  queuePort: "61613",
  queueUsername: "***",
  queuePassword: "***",
  queueReceive: "queue-in-amjadi-stomp",
  queueSend: "queue-out-amjadi-stomp",
  queueConnectionTimeout: 20000,
  asyncLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};
```

### MQTT parameters

```javascript
var params = {
    protocol: 'mqtt',
    mqttHost: '172.16.106.26',
    mqttPort: '1883',
    mqttUsername: '***',
    mqttPassword: '***',
    mqttConnectionTimeout: 20000,
    mqttClientId: 1234,
    mqttInputQueueName: "out/mqqttout",
    mqttOutputQueueName: "async/chat-server",
    peerId: 118401,
    asyncLogging: {
        onFunction: true, // log main actions on console
        onMessageReceive: true, // log received messages on console
        onMessageSend: true // log sent messaged on console
    }
};
```

After setting parameters you can make a new connection to Async server.

```javascript
var asyncClient = new Async(params);
```

### Async Ready Event

After making a new connection, you should wait for asyncReady event to fire so you could be sure that the connection has been estabilished and you are ready to go

```javascript
asyncClient.on("asyncReady", function() {
  /**
  * Write your code inside asyncReady() function
  */
});
```

### Receive messages

In order to receive messages from Async server, you could listen to `message` event.

```javascript
/**
* Listening to responses came from DIRANA
*/
asyncClient.on("message", function(message, ack) {
  console.log(message);
});
```

### Send message

To send a new message to Async server you can use `send()` function.

```javascript
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
```

## Motivation

This module helps you to easily connect POD chat service.

## Installation

```javascript
npm install podasync --save
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
