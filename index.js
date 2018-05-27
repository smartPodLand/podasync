var Async = require('./src/network/async.js');
var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  token: "afa51d8291dc4072a0831d3a18cb5030", // {**REQUIRED**} SSO Token Barzegar
  wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
  connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
  connectionCheckTimeout: 90000, // Socket connection live time on server
  connectionCheckTimeoutThreshold: 20000, // Socket Ping time threshold
  messageTtl: 5000, // Message time to live
  reconnectOnClose: true, // auto connect to socket after socket close
  consoleLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};

var PID;

var asyncClient = new Async(params);

asyncClient.asyncReady(function() {
  PID = asyncClient.getPeerId();

  var newCustomMessage2 = {
    type: 5,
    content: {
      receivers: ['118833'],
      content: "Hello!"
    }
  };

  /**
   * Uncomment to send a message every 5 seconds
   */
  // var m1 = setInterval(function() {
  //   asyncClient.send(newCustomMessage2);
  // }, 5000);

  asyncClient.on("stateChange", function(currentState) {
    /**
     * You can get async state changes here
     */
    console.log("Currrent Async State => ", currentState);
  });

  asyncClient.on("message", function(msg, ack) {
    /**
     * You can handle received message here
     */
  });

  /**
  * Uncomment to auto logout after 40 seconds
  */
  // setTimeout(function() {
  //   console.log("\n:::::::::::::: L O G G I N G :::: O U T ::::::::::::::::::::\n");
  //   asyncClient.close();
  // }, 40000);
});
