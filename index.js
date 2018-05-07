var Async = require('./src/async.js');
var params = {
  socketAddress: "ws://172.16.110.235:8003/ws",
  serverName: "oauth-wire",
  wsConnectionWaitTime: 500,
  connectionRetryInterval: 5000,
  connectionCheckTimeout: 10000, //Ping time
  connectionCheckTimeoutThreshold: 400,
  messageTtl: 5000
};

var PID;

var asyncClient = new Async(params);

asyncClient.asyncReady(function() {
  PID = asyncClient.getPeerId();

  var newCustomMessage2 = {
    type: 3,
    content: {
      receivers: [2716132],
      content: "Hello"
    }
  };

  var m1 = setInterval(function() {
    asyncClient.send(newCustomMessage2);
  }, 3000);

  asyncClient.on("message", function(msg, ack) {
    console.log("> ::::: Recievied msg to asyncClient\n");
    console.log(msg);
  });

  /**
  * Checking how the push data Queue works when connection interupts
  */
  setTimeout(function() {
    console.log("\n:::::::::::::: L O G G I N G :::: O U T ::::::::::::::::::::\n");
    asyncClient.close();
  }, 20000);
});
