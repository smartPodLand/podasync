var assert = require('assert');
var WebSocket = require('ws');
var PodSocket = require('../src/network/socket.js');
var PodActiveMQ = require('../src/network/activemq.js');
var PodMQTT = require('../src/network/mqtt.js');
var Async = require('../src/network/async.js');

var DEVICE_IDS = {
  DEVICEID_1: "94af0c8f381deeb7aa28a85c473641c1-zizi", // ZiZi
  DEVICEID_2: "94af0c8f381deeb7aa28a85c473641c1-jiji" // JiJi
}

var websocketParams = {
  protocol: "websocket",
  socketAddress: "ws://172.16.106.26:8003/ws",
  serverName: "chat-server",
  deviceId: DEVICE_IDS.DEVICEID_1,
  reconnectOnClose: false,
  consoleLogging: {
    onFunction: true,
    onMessageReceive: true,
    onMessageSend: true
  }
};

var websocketParams2 = Object.assign({}, websocketParams);
websocketParams2.deviceId = DEVICE_IDS.DEVICEID_2;

var queueParams = {
  protocol: "queue",
  queueHost: "172.16.0.248",
  queuePort: "61613",
  queueUsername: "root",
  queuePassword: "zalzalak",
  queueReceive: "queue-in-amjadi-stomp",
  queueSend: "queue-out-amjadi-stomp",
  queuePeerId: "7313836",
  queueConnectionTimeout: 20000,
  asyncLogging: {
    onFunction: true,
    onMessageReceive: true,
    onMessageSend: true
  }
};

var mqttParams = {
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
        onFunction: true,
        onMessageReceive: true,
        onMessageSend: true
    }
};
/**
 * Websocket Protocol
 */
describe('Web Socket Protocol', function() {
  var client;

  beforeEach(() => {
    client = new WebSocket(websocketParams.socketAddress, []);
  });

  afterEach(() => {
    client.close();
  });

  it("Should Connect to " + websocketParams.socketAddress, function(done) {
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
 * ActiveMQ Protocol
 */
describe('ActiveMQ Protocol via STOMP', function() {
  var client;

  beforeEach(() => {
    client = new PodActiveMQ({
      username: queueParams.queueUsername,
      password: queueParams.queuePassword,
      host: queueParams.queueHost,
      port: queueParams.queuePort,
      timeout: queueParams.queueConnectionTimeout
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  it("Should Connect to " + queueParams.queueHost + ":" + queueParams.queuePort, function(done) {
    client.on("init", function() {
      done();
    });
  });
});

/**
 * MQTT Protocol
 */
describe('MQTT Protocol', function() {
    var client;

    beforeEach(() => {
        client = new PodMQTT({
            keepalive: mqttParams.keepalive || 60,
            reschedulePings: (typeof mqttParams.reschedulePings == 'boolean') ? mqttParams.reschedulePings : true,
            clientId: mqttParams.mqttClientId.toString() || 'podmqtt_' + Math.random()
                .toString(16)
                .substr(2, 8),
            protocolId: mqttParams.protocolId || 'MQTT',
            protocolVersion: mqttParams.protocolVersion || 4,
            clean: (typeof mqttParams.clean == 'boolean') ? mqttParams.clean : true,
            reconnectPeriod: mqttParams.reconnectPeriod || 1000,
            connectTimeout: mqttParams.connectTimeout || 30 * 1000,
            username: mqttParams.mqttUsername,
            password: mqttParams.mqttPassword,
            resubscribe: (typeof mqttParams.resubscribe == 'boolean') ? mqttParams.resubscribe : true,
            host: mqttParams.mqttHost,
            port: mqttParams.mqttPort,
            inputQueueName: mqttParams.mqttInputQueueName,
            outputQueueName: mqttParams.mqttOutputQueueName
        });
});

    afterEach(() => {
        client.end();
});

    it("Should Connect to " + mqttParams.mqttHost + ":" + mqttParams.mqttPort, function(done) {
        client.on("connect", function() {
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
    socket = new PodSocket(websocketParams);
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
        socket.emit({
          type: 0,
          content: ""
        });
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

  var asyncClient1,
    asyncClient2,
    peerId;

  beforeEach(() => {
    asyncClient1 = new Async(websocketParams);
    asyncClient2 = new Async(websocketParams2);
  });

  afterEach(() => {
    asyncClient1.logout();
    asyncClient2.logout();
  });

  it("Should Connect to Async and Get Ready", function(done) {
    asyncClient1.on("asyncReady", function() {
      done();
    });
  });

  it("Should Connect to Async and Get Client's PeerID", function(done) {
    asyncClient2.on("asyncReady", function() {
      peerId = asyncClient2.getPeerId();
      if (peerId) {
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

  var asyncClient1,
    asyncClient2,
    peerId1,
    peerId2;

  beforeEach(() => {
    asyncClient1 = new Async(websocketParams);
    asyncClient2 = new Async(websocketParams2);
  });

  afterEach(() => {
    asyncClient1.logout();
    asyncClient2.logout();
  });

  it("Should be Able to Send Type 3 Message from Client1 to Client2", function(done) {
    var msg = "";
    asyncClient1.on("asyncReady", function recursive() {
      peerId1 = asyncClient1.getPeerId();
      if (msg.type !== undefined) {
        asyncClient1.send(msg);
      } else {
        setTimeout(function() {
          recursive();
        }, 10);
      }
    });

    asyncClient2.on("asyncReady", function() {
      peerId2 = asyncClient2.getPeerId();

      msg = {
        type: 3,
        content: {
          receivers: [peerId2],
          content: "Hello"
        }
      };
    });

    asyncClient2.on("message", function(msg, ack) {
      if (msg.senderId == peerId1) {
        done();
      }
    });
  });

  it("Should be Able to Send Type 3 Message from Client2 to Client1", function(done) {
    var msg = "";
    asyncClient2.on("asyncReady", function recursive() {
      peerId2 = asyncClient2.getPeerId();
      if (msg.type !== undefined) {
        asyncClient2.send(msg);
      } else {
        setTimeout(function() {
          recursive();
        }, 10);
      }
    });

    asyncClient1.on("asyncReady", function() {
      peerId1 = asyncClient1.getPeerId();

      msg = {
        type: 3,
        content: {
          receivers: [peerId1],
          content: "Hello"
        }
      };
    });

    asyncClient1.on("message", function(msg, ack) {
      if (msg.senderId == peerId2) {
        done();
      }
    });
  });
});

/**
 * POD Async Sending & Receiving Type 5
 */
describe("POD Async Sending & Receiving Type 5 (SENDER ACK NEEDED)", function() {
  this.timeout(50000);

  var asyncClient1,
    asyncClient2,
    peerId1,
    peerId2;

  beforeEach(() => {
    asyncClient1 = new Async(websocketParams);
    asyncClient2 = new Async(websocketParams2);
  });

  afterEach(() => {
    asyncClient1.logout();
    asyncClient2.logout();
  });

  it("Should be Able to Send Type 5 Message from Client1 to Client2 and Receive ACK", function(done) {
    var msg = "";
    asyncClient1.on("asyncReady", function recursive() {
      peerId1 = asyncClient1.getPeerId();
      if (msg.type !== undefined) {
        asyncClient1.send(msg);
      } else {
        setTimeout(function() {
          recursive();
        }, 10);
      }
    });

    asyncClient2.on("asyncReady", function() {
      peerId2 = asyncClient2.getPeerId();

      msg = {
        type: 5,
        content: {
          receivers: [peerId2],
          content: "Hello"
        }
      };
    });

    asyncClient2.on("message", function(msg) {});

    asyncClient1.on("message", function(msg) {
      if (msg.senderId == peerId2) {
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

  var asyncClient1,
    asyncClient2,
    peerId1,
    peerId2;

  beforeEach(() => {
    asyncClient1 = new Async(websocketParams);
    asyncClient2 = new Async(websocketParams2);
  });

  afterEach(() => {
    asyncClient1.logout();
    asyncClient2.logout();
  });

  it("Should be Able to Send Type 5 Message from Client1 to Client2 and Receive ACK", function(done) {
    var msg = "";
    asyncClient1.on("asyncReady", function recursive() {
      peerId1 = asyncClient1.getPeerId();
      if (msg.type !== undefined) {
        asyncClient1.send(msg, console.log("    ✴ \x1b[33m%s\x1b[0m", "ACK CallBack Function Invoked Successfully"));
      } else {
        setTimeout(function() {
          recursive();
        }, 10);
      }
    });

    asyncClient2.on("asyncReady", function() {
      peerId2 = asyncClient2.getPeerId();

      msg = {
        type: 5,
        content: {
          receivers: [peerId2],
          content: "Hello"
        }
      };
    });

    asyncClient2.on("message", function(msg, ack) {});

    asyncClient1.on("message", function(msg, ack) {
      if (msg.senderId == peerId2) {
        done();
      }
    });
  });
});
