(function() {
  /*
   * Socket Module to connect and handle Socket functionalities
   * @constructor
   * @module Socket
   *
   * @param {Object} params
   */

  function Socket(params) {
    if (typeof(WebSocket) === "undefined" && typeof(require) !== "undefined" && typeof(exports) !== "undefined") {
      WebSocket = require('ws');
    }

    /*******************************************************
     *          P R I V A T E   V A R I A B L E S          *
     *******************************************************/

    var address = params.socketAddress,
      eventCallback = {},
      socket,
      waitForSocketToConnectTimeoutId,
      wsConnectionWaitTime = params.wsConnectionWaitTime || 500,
      lastMessageTime,
      lastMessageTimeoutId,
      lastPingTimeoutId,
      connectionCheckTimeout = params.connectionCheckTimeout || 10000,
      connectionCheckTimeoutThreshold = params.connectionCheckTimeoutThreshold || 400,
      pingTimeCheck = connectionCheckTimeout - connectionCheckTimeoutThreshold;

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        connect();
      },

      connect = function() {
        try {
          socket = new WebSocket(address, []);

          socket.onopen = function(event) {
            waitForSocketToConnect(function() {
              eventCallback["open"]();
            });
          }

          socket.onmessage = function(event) {
            let messageData = JSON.parse(event.data);
            eventCallback["message"](messageData);

            lastPingTimeoutId && clearTimeout(lastPingTimeoutId);
            lastMessageTimeoutId && clearTimeout(lastMessageTimeoutId);

            lastMessageTime = new Date();
            lastMessageTimeoutId = setTimeout(function() {
              let currentDate = new Date();
              if (currentDate - lastMessageTime >= pingTimeCheck) {
                ping();
              }
            }, connectionCheckTimeout);
          }

          socket.onclose = function(event) {
            lastMessageTimeoutId && clearTimeout(lastMessageTimeoutId);
            lastPingTimeoutId && clearTimeout(lastPingTimeoutId);

            eventCallback["close"](event);
          }

          socket.onerror = function(event) {
            eventCallback["error"](event);
          }
        } catch (error) {
          console.log("Socket Module Catch Error => ", error);
        }
      },

      ping = function() {
        sendData({type: 0});

        lastPingTimeoutId = setTimeout(function() {
          let currentDate = new Date();

          if (currentDate - lastMessageTime >= connectionCheckTimeout + connectionCheckTimeoutThreshold) {
            socket.close(4002);
          }
        }, connectionCheckTimeout);
      },

      waitForSocketToConnect = function(callback) {
        if (waitForSocketToConnectTimeoutId) {
          clearTimeout(waitForSocketToConnectTimeoutId);
        }

        waitForSocketToConnectTimeoutId = setTimeout(function() {
          if (socket.readyState == 1) {
            callback();
          } else {
            waitForSocketToConnect(callback);
          }
        }, wsConnectionWaitTime);
      },

      sendData = function(params) {
        let data = {
          type: params.type
        };

        try {
          if (params.content) {
            data.content = JSON.stringify(params.content);
          }
          socket.send(JSON.stringify(data));
        } catch (e) {
          console.log("Socket Module SendData Error =>", e);
        }
      };

    /*******************************************************
     *             P U B L I C   M E T H O D S             *
     *******************************************************/

    this.on = function(messageName, callback) {
      eventCallback[messageName] = callback;
    }

    this.emit = sendData;

    this.connect = function() {
      connect();
    }

    this.disconnect = function() {
      socket.close(4003);
    }

    this.close = function() {
      lastMessageTimeoutId && clearTimeout(lastMessageTimeoutId);
      lastPingTimeoutId && clearTimeout(lastPingTimeoutId);
      socket.close(4002);
    }

    this.logout = function() {
      lastMessageTimeoutId && clearTimeout(lastMessageTimeoutId);
      lastPingTimeoutId && clearTimeout(lastPingTimeoutId);
      socket.close(4001);
    }

    init();
  }

  if (typeof exports !== undefined && module.exports) {
    module.exports = Socket;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Socket = Socket;
  }

})();
