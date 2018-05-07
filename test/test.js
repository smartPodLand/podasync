var assert = require('assert');


var WebSocket = require('ws');
var PODSocket = require('../src/socket.js');
var Async = require('../src/async.js');

var params = {
  socketAddress: "ws://172.16.110.235:8003/ws",
  serverName: "oauth-wire"
};

describe('Web Socket Protocol', function() {
  it("Should Connect to " + params.socketAddress, function(done) {
    client = new WebSocket(params.socketAddress, []);
    client.on("open", function() {
      done();
    });
  });

  it("Should Receive Messages", function(done) {
    client = new WebSocket(params.socketAddress, []);
    client.on("message", function(msg) {
      done();
    });
  });

  it("Should Send Empty Message ({type:0, content:\"\"})", function(done) {
    client = new WebSocket(params.socketAddress, []);
    let data = {
      type: 0
    };

    client.on("open", function() {
      client.send(JSON.stringify(data));
      done();
    });
  });

  it("Should Close Socket Connection", function(done) {
    client = new WebSocket(params.socketAddress, []);

    client.on("open", function() {
      client.close();
    });

    client.on("close", function() {
      done();
    });
  });

  // it("Should Logout", function(done){
  //   client = new WebSocket(params.socketAddress, []);
  //
  //   client.on("open", function() {
  //     client.logout();
  //   });
  //
  //   client.on("close", function() {
  //     done();
  //   });
  // });
});

describe("POD Socket Class", function(){
  it("Should Connect to WebSocket Through POD Socket Class", function(done){
    socket = new PODSocket(params);
    // socket.on("open", function(){
    //   console.log("opened");
    // });
    socket.on("message", function(msg) {
      console.log(msg);
      // done();
    });
  });
});
