var Async = require('./src/network/async.js');
var params = {
  socketAddress: "ws://172.16.110.235:8003/ws",
  serverName: "oauth-wire",
  wsConnectionWaitTime: 500,
  connectionRetryInterval: 5000,
  connectionCheckTimeout: 30000,
  connectionCheckTimeoutThreshold: 10000,
  messageTtl: 5000,
  reconnectOnClose: true,
  consoleLogging: {
    onFunction: true,
    onMessageReceive: true,
    onMessageSend: true
  }
};

var PID,
  AsyncState;

var asyncStateType = {
  CONNECTING: 0, // The connection is not yet open.
  OPEN: 1, // The connection is open and ready to communicate.
  CLOSING: 2, // The connection is in the process of closing.
  CLOSED: 3 // The connection is closed or couldn't be opened.
};

var asyncClient = new Async(params);

asyncClient.asyncReady(function() {
  PID = asyncClient.getPeerId();

  var newCustomMessage2 = {
    type: 3,
    content: {
      receivers: ['2735737'],
      content: "Hello"
    }
  };
  var m1 = setInterval(function() {
    asyncClient.send(newCustomMessage2);
  }, 4000);

  asyncClient.on("stateChange", function(currentState) {
    console.log("Currrent Async State => ", currentState);
  });

  asyncClient.on("message", function(msg, ack) {
    ack();
  });

  /**
  * Checking how the push data Queue works when connection interupts
  */
  setTimeout(function() {
    console.log("\n:::::::::::::: L O G G I N G :::: O U T ::::::::::::::::::::\n");
    asyncClient.close();
  }, 40000);
});
