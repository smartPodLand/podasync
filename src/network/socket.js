(function() {
  /*
   * Socket Module to connect and handle Socket functionalities
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
      wsConnectionWaitTime = params.wsConnectionWaitTime || 500,
      connectionCheckTimeout = params.connectionCheckTimeout || 90000,
      connectionCheckTimeoutThreshold = params.connectionCheckTimeoutThreshold || 20000,
      eventCallback = {},
      socket,
      waitForSocketToConnectTimeoutId,
      lastReceivedMessageTime,
      lastReceivedMessageTimeoutId,
      lastSentMessageTime,
      lastSentMessageTimeoutId,
      JSTimeLatency = 100;

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
            var messageData = JSON.parse(event.data);
            eventCallback["message"](messageData);

            lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);
            lastReceivedMessageTimeoutId && clearTimeout(lastReceivedMessageTimeoutId);

            lastReceivedMessageTime = new Date();

            lastReceivedMessageTimeoutId = setTimeout(function() {
              var currentDate = new Date();
              if (currentDate - lastReceivedMessageTime > connectionCheckTimeout - connectionCheckTimeoutThreshold) { //-JSTimeLatency
                ping();
              }
            }, connectionCheckTimeout - connectionCheckTimeoutThreshold);
          }

          socket.onclose = function(event) {
            lastReceivedMessageTimeoutId && clearTimeout(lastReceivedMessageTimeoutId);
            lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);
            eventCallback["close"](event);
          }

          socket.onerror = function(event) {
            eventCallback["error"](event);
          }
        } catch (error) {
          throw new Error(error);
        }
      },

      ping = function() {
        sendData({type: 0});

        lastSentMessageTimeoutId = setTimeout(function() {
          if (lastSentMessageTime - lastReceivedMessageTime > connectionCheckTimeout + connectionCheckTimeoutThreshold) {
            socket.close();
          }
        }, connectionCheckTimeout + connectionCheckTimeoutThreshold);
      },

      waitForSocketToConnect = function(callback) {
        waitForSocketToConnectTimeoutId && clearTimeout(waitForSocketToConnectTimeoutId);

        if (socket.readyState === 1) {
          callback();
        } else {
          waitForSocketToConnectTimeoutId = setTimeout(function() {
            if (socket.readyState === 1) {
              callback();
            } else {
              waitForSocketToConnect(callback);
            }
          }, wsConnectionWaitTime);
        }
      },

      sendData = function(params) {
        var data = {
          type: params.type
        };

        lastSentMessageTime = new Date();

        try {
          if (params.content) {
            data.content = JSON.stringify(params.content);
          }

          if (socket.readyState === 1)
            socket.send(JSON.stringify(data));
          }
        catch (error) {
          throw new Error(error);
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

    this.close = function() {
      lastReceivedMessageTimeoutId && clearTimeout(lastReceivedMessageTimeoutId);
      lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);
      socket.close();
    }

    init();
  }

  if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
    module.exports = Socket;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Socket = Socket;
  }

})();
