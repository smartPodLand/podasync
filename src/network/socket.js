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
      connectionCheckTimeout = params.connectionCheckTimeout || 10000,
      eventCallback = {},
      socket = {},
      waitForSocketToConnectTimeoutId,
      lastReceivedMessageTime,
      lastReceivedMessageTimeoutId,
      lastSentMessageTime,
      lastSentMessageTimeoutId,
      forceCloseSocket = false,
      forceCloseSocketTimeout,
      JSTimeLatency = 10,
      socketRealTimeStatusInterval;

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        connect();
      },

      connect = function() {
        try {
          socket.id = new Date().getTime();
          socket.socket = new WebSocket(address, []);

          socketRealTimeStatusInterval && clearInterval(socketRealTimeStatusInterval);
          socketRealTimeStatusInterval = setInterval(function() {
            switch (socket.socket.readyState) {
              case 2:
                onCloseHandler(null);
                break;
            }
          }, 5000);

          socket.socket.onopen = function(event) {
            waitForSocketToConnect(function() {
              eventCallback["open"]();
            });
          }

          socket.socket.onmessage = function(event) {
            /**
             * To avoid manually closing socket's connection
             */
            forceCloseSocket = false;

            var messageData = JSON.parse(event.data);
            eventCallback["message"](messageData);

            lastReceivedMessageTimeoutId && clearTimeout(lastReceivedMessageTimeoutId);
            forceCloseSocketTimeout && clearTimeout(forceCloseSocketTimeout);

            lastReceivedMessageTime = new Date();

            lastReceivedMessageTimeoutId = setTimeout(function() {
              var currentDate = new Date();
              if (currentDate - lastReceivedMessageTime >= connectionCheckTimeout - JSTimeLatency) {
                /**
                 * If message's type is not 5, socket won't get any acknowledge packet,therefore
                 * you may think that connection has been closed and you would force socket
                 * to close, but before that you should make sure that connection is actually closed!
                 * for that, you must send a ping message and if that message don't get any
                 * responses too, you are allowed to manually kill socket connection.
                 */
                ping();
                /**
                 * We set forceCloseSocket as true so that if your ping's response don't make it
                 * you close your socket
                 */
                forceCloseSocket = true;

                /**
                 * If type of messages are not 5, you won't get ant ACK packets
                 * for that being said, we send a ping message to be sure of
                 * socket connection's state. The ping message should have an
                 * ACK, if not, you're allowed to close your socket after
                 * [connectionCheckTimeout] seconds
                 */
                forceCloseSocketTimeout = setTimeout(function() {
                  if (forceCloseSocket) {
                    socket.socket.close();
                  }
                }, 4 * connectionCheckTimeout);
              }
            }, connectionCheckTimeout);
          }

          socket.socket.onclose = function(event) {
            onCloseHandler(event);
          }

          socket.socket.onerror = function(event) {
            eventCallback["error"](event);
          }
        } catch (error) {
          eventCallback["customError"]({
            errorCode: 4000,
            errorMessage: "ERROR in WEBSOCKET!",
            errorEvent: error
          });
        }
      },

      onCloseHandler = function(event) {
        lastReceivedMessageTimeoutId && clearTimeout(lastReceivedMessageTimeoutId);
        lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);
        eventCallback["close"](event);
      },

      ping = function() {
        sendData({
          type: 0
        });
      },

      waitForSocketToConnect = function(callback) {
        waitForSocketToConnectTimeoutId && clearTimeout(waitForSocketToConnectTimeoutId);

        if (socket.socket.readyState === 1) {
          callback();
        } else {
          waitForSocketToConnectTimeoutId = setTimeout(function() {
            if (socket.socket.readyState === 1) {
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

        if (params.trackerId) {
          data.trackerId = params.trackerId;
        }

        lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);

        lastSentMessageTime = new Date();

        lastSentMessageTimeoutId = setTimeout(function() {
          var currentDate = new Date();
          if (currentDate - lastSentMessageTime >= connectionCheckTimeout - JSTimeLatency) {
            ping();
          }
        }, connectionCheckTimeout);

        try {
          if (params.content) {
            data.content = JSON.stringify(params.content);
          }

          if (socket.socket.readyState === 1) {
            socket.socket.send(JSON.stringify(data));
          }
        } catch (error) {
          eventCallback["customError"]({
            errorCode: 4004,
            errorMessage: "Error in Socket sendData!",
            errorEvent: error
          });
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
      socket.socket.close();
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
