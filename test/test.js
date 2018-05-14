var assert = require('assert');
var WebSocket = require('ws');
var PODSocket = require('../src/network/socket.js');
var Async = require('../src/network/async.js');

var params = {
  socketAddress: "ws://172.16.110.235:8003/ws",
  serverName: "oauth-wire",
  reconnectOnClose: false,
  consoleLogging: {
    // onFunction: true,
    // onMessageReceive: true,
    // onMessageSend: true
  }
};

/**
* Websocket Protocol
*/
describe('Web Socket Protocol', function() {
  var client;

  beforeEach(() => {
    client = new WebSocket(params.socketAddress, []);
  });

  afterEach(() => {
    client.close();
  });

  it("Should Connect to " + params.socketAddress, function(done) {
    client.on("open", function() {
      assert.equal(client.readyState, 1);
      done();
    });
  });

  it("Should Receive Messages", function(done) {
    client.on("message", function(msg) {
      done();
    });
  });

  it("Should Send Empty Message ({type:0, content:\"\"})", function(done) {
    let data = {
      type: 0
    };

    client.on("open", function() {
      try {
        client.send(JSON.stringify(data));
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("Should Close Socket Connection", function(done) {

    client.on("open", function() {
      client.close();
    });

    client.on("close", function() {
      done();
    });
  });
});

/**
* POD Socket Class
*/
describe("POD Socket Class", function() {
  var socket;

  beforeEach(() => {
    socket = new PODSocket(params);
    socket.on("open", function() {});
    socket.on("message", function() {});
    socket.on("error", function() {});
    socket.on("close", function() {});
  });

  afterEach(() => {
    socket.close();
  });

  it("Should Connect to WebSocket Through POD Socket Class", function(done) {
    socket.on("open", function() {
      done();
    });
  });

  it("Should Receive Messages Through POD Socket Class", function(done) {
    socket.on("message", function(msg) {
      done();
    });
  });

  it("Should Send Empty Message ({type:0, content:\"\"}) Through POD Socket Class", function(done) {
    socket.on("open", function() {
      try {
        socket.emit({type: 0, content: ""});
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it("Should Close Socket Connection", function(done) {

    socket.on("open", function() {
      socket.close();
    });

    socket.on("close", function() {
      done();
    });
  });
});

/**
* POD Async Class Connecting
*/
describe("POD Async Class Connecting", function() {
  this.timeout(5000);

  var asyncClient,
    asyncClient2,
    peerId;

  it("Should Connect to Async and Get Ready", function(done) {
    asyncClient = new Async(params);
    asyncClient.asyncReady(function() {
      done();
    });
  });

  it("Should Connect to Async and Get Client's PeerID", function(done) {
    asyncClient2 = new Async(params);
    asyncClient2.asyncReady(function() {
      peerId = asyncClient2.getPeerId();
      if (peerId && peerId.length == 7) {
        done();
      }
    });
  });
});

/**
* POD Async Sending & Receiving Type 3
*/
describe("POD Async Sending & Receiving Type 3", function() {
  this.timeout(5000);

  var asyncClient3 = new Async(params),
    asyncClient4 = new Async(params),
    peerId3,
    peerId4;

  asyncClient3.asyncReady(function() {
    peerId3 = asyncClient3.getPeerId();
  });

  asyncClient4.asyncReady(function() {
    peerId4 = asyncClient4.getPeerId();
  });

  it("Should be Able to Send Type 3 Message from Client1 to Client2", function(done) {
    var msg = {
      type: 3,
      content: {
        receivers: [peerId4],
        content: "Hello"
      }
    };

    asyncClient3.send(msg);
    asyncClient4.on("message", function(msg, ack) {
      if (msg.senderId == peerId3)
        done();
      }
    );
  });

  it("Should be Able to Send Type 3 Message from Client2 to Client1", function(done) {
    var msg = {
      type: 3,
      content: {
        receivers: [peerId3],
        content: "Hello"
      }
    };

    asyncClient4.send(msg);
    asyncClient3.on("message", function(msg, ack) {
      if (msg.senderId == peerId4)
        done();
      }
    );
  });

});

/**
* POD Async Sending & Receiving Type 5
*/
describe("POD Async Sending & Receiving Type 5 (SENDER ACK NEEDED)", function() {
  this.timeout(5000);

  var asyncClient5 = new Async(params),
    asyncClient6 = new Async(params),
    peerId5,
    peerId6;

  asyncClient5.asyncReady(function() {
    peerId5 = asyncClient5.getPeerId();
  });

  asyncClient6.asyncReady(function() {
    peerId6 = asyncClient6.getPeerId();
  });

  it("Should be Able to Send Type 5 Message from Client1 to Client2 and Receive ACK", function(done) {
    var msg = {
      type: 5,
      content: {
        receivers: [peerId6],
        content: "Hello"
      }
    };

    asyncClient5.send(msg);

    asyncClient6.on("message", function(msg, ack){
    });

    asyncClient5.on("message", function(msg, ack) {
      if (msg.senderId == peerId6) {
        done();
      }
    });
  });

});


/**
* POD Async Sending & Receiving Type 5
*/
describe("POD Async Sending & Receiving Type 5 (SENDER ACK NEEDED) And Invoking Callback Function", function() {
  this.timeout(5000);

  var asyncClient7 = new Async(params),
    asyncClient8 = new Async(params),
    peerId7,
    peerId8;

  asyncClient7.asyncReady(function() {
    peerId7 = asyncClient7.getPeerId();
  });

  asyncClient8.asyncReady(function() {
    peerId8 = asyncClient8.getPeerId();
  });

  it("Should be Able to Send Type 5 Message from Client1 to Client2 and Receive ACK", function(done) {
    var msg = {
      type: 5,
      content: {
        receivers: [peerId8],
        content: "Hello"
      }
    };

    asyncClient7.send(msg, console.log("    ✴ \x1b[33m%s\x1b[0m", "ACK CallBack Function Invoked Successfully"));

    asyncClient8.on("message", function(msg, ack){
    });

    asyncClient7.on("message", function(msg, ack) {
      if (msg.senderId == peerId8) {
        done();
      }
    });
  });
});
