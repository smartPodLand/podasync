var Async = require('./src/network/async.js');
var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  deviceId: "540c3871-35fe-42ef-9679-bd277940b410150947165557098", // {**REQUIRED**} Device ID ZiZi
  reconnectOnClose: true, // auto connect to socket after socket close,
  connectionCheckTimeout: 10000,
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
asyncClient.on("asyncReady", function() {
  PID = asyncClient.getPeerId();
});

/**
 * Handle Async Error here
 */
asyncClient.on("error", function(error) {
  switch (error.errorCode) {
    // Socket Closed
    case 4005:
      clearInterval(sendMessageInterval);
      break;

    default:
      break;
  }
});

/**
 * You can handle received message here
 */
asyncClient.on("message", function(msg, ack) {

});

/**
 * You can get async state changes here
 */
asyncClient.on("stateChange", function(currentState) {
  switch (currentState.socketState) {
    case 1:
      /**
       * Send Message Every 5 Seconds
       */
      if (!sendMessageInterval) {
        sendMessageInterval = setInterval(function() {
          asyncClient.send({
            type: 3,
            content: {
              receivers: ['143417'],
              content: "Hello!"
            }
          });
        }, 5000);
      }

      break;

    case 0:
    case 2:
    case 3:
      // clearInterval(sendMessageInterval);
      break;

  }
});
