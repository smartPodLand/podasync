(function() {
  /*
   * Async module to handle async messaging
   * @module Async
   *
   * @param {Object} params
   */

  function Async(params) {

    /*******************************************************
     *          P R I V A T E   V A R I A B L E S          *
     *******************************************************/

    var PodSocketClass,
      PodUtility;

    if (typeof(require) !== "undefined" && typeof(exports) !== "undefined") {
      PodSocketClass = require('./socket.js');
      PodUtility = require('../utility/utility.js');
    } else {
      PodSocketClass = POD.Socket;
      PodUtility = POD.Utility;
    }

    var Utility = new PodUtility();

    var asyncMessageType = {
      PING: 0,
      SERVER_REGISTER: 1,
      DEVICE_REGISTER: 2,
      MESSAGE: 3,
      MESSAGE_ACK_NEEDED: 4,
      MESSAGE_SENDER_ACK_NEEDED: 5,
      ACK: 6,
      GET_REGISTERED_PEERS: 7,
      PEER_REMOVED: -3,
      REGISTER_QUEUE: -2,
      NOT_REGISTERED: -1,
      ERROR_MESSAGE: -99
    };

    var asyncStateType = {
      CONNECTING: 0, // The connection is not yet open.
      OPEN: 1, // The connection is open and ready to communicate.
      CLOSING: 2, // The connection is in the process of closing.
      CLOSED: 3 // The connection is closed or couldn't be opened.
    };

    var appId = params.appId || "POD-Chat",
      deviceId = (params.deviceId)
        ? params.deviceId
        : undefined,
      address = params.socketAddress,
      eventCallbacks = {
        connect: {},
        disconnect: {},
        reconnect: {},
        message: {},
        asyncReady: {},
        stateChange: {}
      },
      ackCallback = {},
      socket,
      isNode = Utility.isNode(),
      isSocketOpen = false,
      isDeviceRegister = false,
      isServerRegister = false,
      connectionState = false,
      asyncState = asyncStateType.CONNECTING,
      registerServerTimeoutId,
      registerDeviceTimeoutId,
      asyncReadyTimeoutId,
      pushSendDataQueue = [],
      oldPeerId,
      peerId = params.peerId,
      lastMessageId = 0,
      messageTtl = params.messageTtl || 5000,
      serverName = params.serverName || "oauth-wire",
      connectionRetryInterval = params.connectionRetryInterval || 5000,
      socketReconnectRetryInterval,
      socketReconnectCheck,
      retryStep = 1,
      reconnectOnClose = (typeof params.reconnectOnClose === "boolean")
        ? params.reconnectOnClose
        : true,
      consoleLogging = (params.consoleLogging && typeof params.consoleLogging.onFunction === "boolean")
        ? params.consoleLogging.onFunction
        : false,
      onReceiveLogging = (params.consoleLogging && typeof params.consoleLogging.onMessageReceive === "boolean")
        ? params.consoleLogging.onMessageReceive
        : false,
      onSendLogging = (params.consoleLogging && typeof params.consoleLogging.onMessageSend === "boolean")
        ? params.consoleLogging.onMessageSend
        : false;
    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        initSocket();
      },

      logger = function(type, msg) {
        var BgColor;

        switch (type) {
          case "Send":
            BgColor = 44;
            FgColor = 34;
            ColorCSS = "#4c8aff";
            break;

          case "Receive":
            BgColor = 45;
            FgColor = 35;
            ColorCSS = "#aa386d";
            break;

          case "Error":
            BgColor = 41;
            FgColor = 31;
            ColorCSS = "#ff0043";
            break;

          default:
            BgColor = 45;
            ColorCSS = "#212121";
            break;
        }

        if (isNode) {
          console.log("\n");
          console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
          console.log("\x1b[" + BgColor + "m\x1b[8m###################\x1b[0m\x1b[37m\x1b[" + BgColor + "mS O C K E T    S T A T U S\x1b[0m\x1b[" + BgColor + "m\x1b[8m###################\x1b[0m");
          console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " PEER ID\t\t", peerId);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " DEVICE ID\t\t", deviceId);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " IS SOCKET OPEN\t", isSocketOpen);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " DEVICE REGISTER\t", isDeviceRegister);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " SERVER REGISTER\t", isServerRegister);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " ASYNC STATE\t\t", asyncState);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[" + FgColor + "m%s\x1b[0m ", " CURRENT MESSAGE\t", type);
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m");

          Object.keys(msg).forEach(function(key) {
            if (typeof msg[key] === 'object') {
              console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t \x1b[1m-\x1b[0m \x1b[35m%s\x1b[0m", key);
              Object.keys(msg[key]).forEach(function(k) {
                console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t   \x1b[1m•\x1b[0m \x1b[35m%s\x1b[0m : \x1b[33m%s\x1b[0m", k, msg[key][k]);
              });
            } else {
              console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t \x1b[1m•\x1b[0m \x1b[35m%s\x1b[0m : \x1b[33m%s\x1b[0m", key, msg[key]);
            }
          });

          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m");

          if (pushSendDataQueue.length > 0) {
            console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m", " SEND QUEUE");
            console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
            Object.keys(pushSendDataQueue).forEach(function(key) {
              if (typeof pushSendDataQueue[key] === 'object') {
                console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t \x1b[1m-\x1b[0m \x1b[35m%s\x1b[0m", key);
                Object.keys(pushSendDataQueue[key]).forEach(function(k) {
                  console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t   \x1b[1m•\x1b[0m \x1b[35m%s\x1b[0m : \x1b[33m%s\x1b[0m", k, pushSendDataQueue[key][k]);
                });
              } else {
                console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t \x1b[1m•\x1b[0m \x1b[35m%s\x1b[0m : \x1b[33m%s\x1b[0m", key, pushSendDataQueue[key]);
              }
            });

          } else {
            console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m ", " SEND QUEUE\t\t", "Empty");
          }

          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
          console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
          console.log("\n");
        } else {
          console.log("\n");
          console.log("%cS O C K E T    S T A T U S", 'background: ' + ColorCSS + '; padding: 10px 138px; font-weight: bold; font-size: 18px; color: #fff;');
          console.log("%c\n", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS);
          console.log("%c   PEER ID\t\t %c" + peerId, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #ffac28; font-weight: bold');
          console.log("%c   DEVICE ID\t\t %c" + deviceId, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #ffac28; font-weight: bold');
          console.log("%c   IS SOCKET OPEN\t %c" + isSocketOpen, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #ffac28; font-weight: bold');
          console.log("%c   DEVICE REGISTER\t %c" + isDeviceRegister, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #ffac28; font-weight: bold');
          console.log("%c   SERVER REGISTER\t %c" + isServerRegister, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #ffac28; font-weight: bold');
          console.log("%c   ASYNC STATE\t\t %c" + asyncState, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #ffac28; font-weight: bold');
          console.log("%c   CURRENT MESSAGE\t %c" + type, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #aa386d; font-weight: bold');
          console.log("%c\n", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS);

          Object.keys(msg).forEach(function(key) {
            if (typeof msg[key] === 'object') {
              console.log("%c \t-" + key, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #777');
              Object.keys(msg[key]).forEach(function(k) {
                console.log("%c \t  •" + k + " : %c" + msg[key][k], 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #777', 'color: #f23; font-weight: bold');
              });
            } else {
              console.log("%c \t•" + key + " : %c" + msg[key], 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #777', 'color: #f23; font-weight: bold');
            }
          });

          console.log("%c\n", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS);

          if (pushSendDataQueue.length > 0) {
            console.log("%c   SEND QUEUE", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444');
            console.log("%c\n", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS);
            Object.keys(pushSendDataQueue).forEach(function(key) {
              if (typeof pushSendDataQueue[key] === 'object') {
                console.log("%c \t-" + key, 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #777');
                Object.keys(pushSendDataQueue[key]).forEach(function(k) {
                  console.log("%c \t  •" + k + " : %c" + pushSendDataQueue[key][k], 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #777', 'color: #f23; font-weight: bold');
                });
              } else {
                console.log("%c \t•" + key + " : %c" + pushSendDataQueue[key], 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #777', 'color: #f23; font-weight: bold');
              }
            });

          } else {
            console.log("%c   SEND QUEUE\t\t %cEmpty", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';color: #444', 'color: #000; font-weight: bold');
          }

          console.log("%c\n", 'border-left: solid 10px ' + ColorCSS);
          console.log("%c\t\t\t\t\t\t\t\t\t\t", 'border-top: solid 10px ' + ColorCSS);
        }
      },

      initSocket = function() {
        setTimeout(function() {
          if (!isSocketOpen) {
            throw new Error("Can Not Open Socket!");
          }
        }, 65000);

        socket = new PodSocketClass(params);

        socket.on("open", function() {
          isSocketOpen = true;
          retryStep = 1;
        });

        socket.on("message", function(msg) {
          handleSocketMessage(msg);
          if (onReceiveLogging) {
            logger("Receive", msg);
          }
        });

        socket.on("close", function(event) {
          isSocketOpen = false;
          isDeviceRegister = false;
          oldPeerId = peerId;
          asyncState = asyncStateType.CLOSED;
          fireEvent("stateChange", asyncStateType.CLOSED);

          if (reconnectOnClose) {
            socketReconnectRetryInterval = setTimeout(function() {
              if (consoleLogging) {
                if (isNode) {
                  console.log("\x1b[46m\x1b[8m##\x1b[0m \x1b[36m%s\x1b[0m", " Reconnecting after " + retryStep + "s ...");
                } else {
                  console.log("%c   Reconnecting after " + retryStep + "s ...", 'border-left: solid #08bbdb 10px; color: #08bbdb;');
                }
              }
              socket.connect();
            }, 1000 * retryStep);
            retryStep *= 2;

            if (!socketReconnectCheck) {
              socketReconnectCheck = setTimeout(function() {
                if (!isSocketOpen) {
                  socketReconnectRetryInterval && clearTimeout(socketReconnectRetryInterval);
                  socketReconnectCheck && clearTimeout(socketReconnectCheck);
                  throw new Error("Can Not Open Socket!");
                }
              }, 65000);
            }
          } else {
            socketReconnectRetryInterval && clearTimeout(socketReconnectRetryInterval);
            socketReconnectCheck && clearTimeout(socketReconnectCheck);
            throw new Error("Socket Closed!");
          }

        });

        socket.on("error", function(error) {
          throw new Error(error);
        });
      },

      handleSocketMessage = function(msg) {
        var ack;

        if (msg.type === asyncMessageType.MESSAGE_ACK_NEEDED || msg.type === asyncMessageType.MESSAGE_SENDER_ACK_NEEDED) {
          ack = function() {
            pushSendData({
              type: asyncMessageType.ACK,
              content: {
                receivers: [msg.senderId],
                messageId: msg.id
              }
            });
          }
        }

        switch (msg.type) {
          case asyncMessageType.PING:
            handleDeviceIdMessage(msg);
            break;

          case asyncMessageType.SERVER_REGISTER:
            handleServerRegisterMessage(msg, ack);
            break;

          case asyncMessageType.DEVICE_REGISTER:
            handleDeviceRegisterMessage(msg.content);
            break;

          case asyncMessageType.MESSAGE:
            fireEvent("message", msg);
            break;

          case asyncMessageType.MESSAGE_ACK_NEEDED:
          case asyncMessageType.MESSAGE_SENDER_ACK_NEEDED:
            fireEvent("message", msg, ack);
            ack();
            break;

          case asyncMessageType.ACK:
            fireEvent("message", msg);
            if (ackCallback[msg.senderMessageId] == "function") {
              ackCallback[msg.senderMessageId]();
              delete ackCallback[msg.senderMessageId];
            }
            break;
        }
      },

      handleDeviceIdMessage = function(msg) {
        if (msg.content) {
          if (deviceId === undefined) {
            deviceId = msg.content;

            if (consoleLogging) {
              if (isNode) {
                console.log("\x1b[46m\x1b[8m##\x1b[0m \x1b[36m%s\x1b[0m", " Device ID => \t" + msg.content);
              } else {
                console.log("%c   Device ID => \t" + msg.content, 'border-left: solid #08bbdb 10px; color: #08bbdb;');
              }
            }
          }
        } else {

          if (consoleLogging) {
            if (isNode) {
              console.log('\x1b[46m\x1b[8m##\x1b[0m \x1b[36m%s\x1b[0m', " Ping Response at  " + new Date());
            } else {
              console.log("%c   Ping Response at  " + new Date(), 'border-left: solid #08bbdb 10px; color: #08bbdb;');
            }
          }
        }

        if (deviceId) {
          if (!isDeviceRegister) {
            registerDevice();
          }
        } else {
          var deviceIdTimeoutId = setTimeout(function() {
            handleDeviceIdMessage();
          }, 500);
        }
      },

      registerDevice = function(isRetry) {

        if (consoleLogging) {
          if (isNode) {
            console.log('\x1b[46m\x1b[8m##\x1b[0m \x1b[36m%s\x1b[0m', " Registering Device ...");
          } else {
            console.log("%c   Registering Device ...", 'border-left: solid #08bbdb 10px; color: #08bbdb;');
          }
        }

        var content = {
          appId: appId,
          deviceId: deviceId
        };

        if (peerId !== undefined) {
          content.refresh = true;
        } else {
          content.renew = true;
        }

        socket.emit({type: asyncMessageType.DEVICE_REGISTER, content: content});
      },

      handleDeviceRegisterMessage = function(recievedPeerId) {
        if (isDeviceRegister) {
          return;
        }

        if (registerDeviceTimeoutId) {
          clearTimeout(registerDeviceTimeoutId);
        }

        isDeviceRegister = true;
        peerId = recievedPeerId;

        if (isServerRegister && peerId === oldPeerId) {
          asyncState = asyncStateType.OPEN;
          fireEvent("stateChange", asyncStateType.OPEN);
          isServerRegister = true;
          pushSendDataQueueHandler();
        } else {
          registerServer();
        }
      },

      registerServer = function() {

        if (consoleLogging) {
          if (isNode) {
            console.log('\x1b[46m\x1b[8m##\x1b[0m \x1b[36m%s\x1b[0m', " Registering Server ...");
          } else {
            console.log("%c   Registering Server ...", 'border-left: solid #08bbdb 10px; color: #08bbdb;');
          }
        }

        var content = {
          name: serverName
        };

        socket.emit({type: asyncMessageType.SERVER_REGISTER, content: content});

        registerServerTimeoutId = setTimeout(function() {
          if (!isServerRegister) {
            registerServer();
          }
        }, connectionRetryInterval);
      },

      handleServerRegisterMessage = function(msg, ack) {
        if (msg.senderName && msg.senderName === serverName) {
          isServerRegister = true;

          if (registerServerTimeoutId) {
            clearTimeout(registerServerTimeoutId);
          }

          asyncState = asyncStateType.OPEN;
          fireEvent("stateChange", asyncStateType.OPEN);
          pushSendDataQueue = [];

          if (consoleLogging) {
            if (isNode) {
              console.log('\x1b[46m\x1b[8m##\x1b[0m \x1b[36m%s\x1b[0m', " Async is Ready ...");
            } else {
              console.log("%c   Async is Ready ...", 'border-left: solid #08bbdb 10px; color: #08bbdb;');
            }
          }

        } else {
          registerServer();
        }
      },

      pushSendData = function(msg) {
        if (onSendLogging)
          logger("Send", msg);

        if (asyncState === asyncStateType.OPEN) {
          socket.emit(msg);
        } else {
          pushSendDataQueue.push(msg);
        }
      },

      clearTimeouts = function() {
        if (registerDeviceTimeoutId != undefined) {
          clearTimeout(registerDeviceTimeoutId);
        }

        if (registerServerTimeoutId != undefined) {
          clearTimeout(registerServerTimeoutId);
        }
      },

      pushSendDataQueueHandler = function() {
        while (pushSendDataQueue.length > 0 && asyncState === asyncStateType.OPEN) {
          var msg = pushSendDataQueue.splice(0, 1)[0];
          pushSendData(msg);
        }
      },

      fireEvent = function(eventName, param, ack) {
        try {
          if (ack) {
            for (var id in eventCallbacks[eventName])
              eventCallbacks[eventName][id](param, ack);
            }
          else {
            for (var id in eventCallbacks[eventName])
              eventCallbacks[eventName][id](param);
            }
          } catch (e) {
          throw e;
        }
      };

    /*******************************************************
     *             P U B L I C   M E T H O D S             *
     *******************************************************/

    this.on = function(eventName, callback) {
      if (eventCallbacks[eventName]) {
        var id = new Date().getTime();
        eventCallbacks[eventName][id] = callback;
        return id;
      }
    }

    this.asyncReady = function asyncReadyCallback(callback) {
      if (asyncReadyTimeoutId)
        clearTimeout(asyncReadyTimeoutId);

      if (asyncState === asyncStateType.OPEN) {
        callback();
      } else {
        asyncReadyTimeoutId = setTimeout(function() {
          if (asyncState === asyncStateType.OPEN) {
            callback();
          } else {
            asyncReadyCallback(callback);
          }
        }, 1000);
      }
    }

    this.send = function(params, callback) {

      var messageType = (typeof params.type === "number")
        ? params.type
        : (callback)
          ? asyncMessageType.MESSAGE_SENDER_ACK_NEEDED
          : asyncMessageType.MESSAGE;

      var socketData = {
        type: messageType,
        content: params.content
      };

      if (messageType === asyncMessageType.MESSAGE_SENDER_ACK_NEEDED || messageType === asyncMessageType.MESSAGE_ACK_NEEDED) {
        lastMessageId += 1;
        var messageId = lastMessageId;

        ackCallback[messageId] = function() {
          callback && callback();
        }

        socketData.content.messageId = messageId;
        socketData.content.ttl = messageTtl;
      }

      pushSendData(socketData);
    }

    this.getSocketConnectionState = function() {
      return connectionState;
    }

    this.getAsyncState = function() {
      return asyncState;
    }

    this.getSendQueue = function() {
      return pushSendDataQueue;
    }

    this.getPeerId = function() {
      return peerId;
    }

    this.close = function() {
      asyncState = asyncStateType.CLOSED;
      fireEvent("stateChange", asyncStateType.CLOSED);
      isDeviceRegister = false;
      isSocketOpen = false;
      socket.close();
    }

    this.logout = function() {
      oldPeerId = peerId;
      peerId = undefined;
      isServerRegister = false;
      isDeviceRegister = false;
      isSocketOpen = false;
      asyncState = asyncStateType.CLOSED;
      fireEvent("stateChange", asyncStateType.CLOSED);
      pushSendDataQueue = [];
      ackCallback = {};
      clearTimeouts();
      socket.close();
    }

    this.reconnectSocket = function() {
      oldPeerId = peerId;
      isDeviceRegister = false;
      isSocketOpen = false;
      asyncState = asyncStateType.CLOSED;
      fireEvent("stateChange", asyncStateType.CLOSED);
      clearTimeouts();
      socket.close();
      if (!reconnectOnClose)
        socket.connect();
      }

    init();
  }

  if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
    module.exports = Async;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Async = Async;
  }
})();
