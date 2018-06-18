var Async = require('./src/network/async.js');
var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  deviceId: "3d943476a879dcf609f79a5ec736bedc", // {**REQUIRED**} Device ID Barzegar
  reconnectOnClose: true, // auto connect to socket after socket close
  asyncLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};

var PID;

var asyncClient = new Async(params);

asyncClient.on("error", function(error) {
  console.log(error);
});

asyncClient.asyncReady(function() {
  PID = asyncClient.getPeerId();

  var newCustomMessage = {
    type: 5,
    content: {
      receivers: ['118833'],
      content: "Hello!"
    }
  };

  /**
   * Send Message
   */
  asyncClient.send(newCustomMessage);

  asyncClient.on("stateChange", function(currentState) {
    /**
     * You can get async state changes here
     */
  });

  asyncClient.on("message", function(msg, ack) {
    /**
     * You can handle received message here
     */
  });
});
