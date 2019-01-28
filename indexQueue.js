var Async = require('./src/network/async.js');
var params = {
  protocol: "queue",
  queueHost: "172.16.0.248",
  queuePort: "61613",
  queueUsername: "root",
  queuePassword: "zalzalak",
  queueReceive: "queue-in-amjadi-stomp",
  queueSend: "queue-out-amjadi-stomp",
  queueConnectionTimeout: 20000,
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

  /**
   * Send Message Every 5 Seconds
   */
  if (!sendMessageInterval) {
    sendMessageInterval = setInterval(function() {
      asyncClient.send({
        type: 3,
        content: {
          receivers: [7323746],
          content: "Send Message With Queue at " + new Date()
        }
      });
    }, 5000);
  }
});

/**
 * Handle Async Error here
 */
asyncClient.on("error", function(error) {
  console.error(error);
});

/**
 * You can handle received message here
 */
asyncClient.on("message", function(msg, ack) {
  // Received Messages
});

/**
 * You can get async state changes here
 */
asyncClient.on("stateChange", function(currentState) {
  // Status
});

asyncClient.on("disconnect", function(e) {
  console.log("Async disconnected! \n", e);
});
