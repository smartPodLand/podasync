var Async = require('../src/network/async.js');

var params = {
    protocol: 'mqtt',
    mqttHost: '172.16.106.26',
    mqttPort: '1883',
    mqttUsername: 'root',
    mqttPassword: 'zalzalak',
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

var PID,
    sendMessageInterval;

var asyncClient = new Async(params);

/**
 * Write your code here
 */
asyncClient.on('asyncReady', function() {
    PID = asyncClient.getPeerId();
});

/**
 * Handle Async Error here
 */
asyncClient.on('error', function(error) {
    console.error(error);
});

/**
 * You can handle received message here
 */
asyncClient.on('message', function(msg, ack) {
    // Received Messages
});

/**
 * You can get async state changes here
 */
asyncClient.on('stateChange', function(currentState) {
    // Status
    console.log("Current MQTT status", currentState);
});

asyncClient.on('disconnect', function(e) {
    console.log('Async disconnected! \n', e);
});
