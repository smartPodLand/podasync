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
      PodUtility,
      http;

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
      deviceId = params.deviceId,
      eventCallbacks = {
        connect: {},
        disconnect: {},
        reconnect: {},
        message: {},
        asyncReady: {},
        stateChange: {},
        error: {}
      },
      ackCallback = {},
      socket,
      isNode = Utility.isNode(),
      isSocketOpen = false,
      isDeviceRegister = false,
      isServerRegister = false,
      asyncState = asyncStateType.CONNECTING,
      registerServerTimeoutId,
      registerDeviceTimeoutId,
      checkIfSocketHasOpennedTimeoutId,
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
      asyncLogging = (params.asyncLogging && typeof params.asyncLogging.onFunction === "boolean")
        ? params.asyncLogging.onFunction
        : false,
      onReceiveLogging = (params.asyncLogging && typeof params.asyncLogging.onMessageReceive === "boolean")
        ? params.asyncLogging.onMessageReceive
        : false,
      onSendLogging = (params.asyncLogging && typeof params.asyncLogging.onMessageSend === "boolean")
        ? params.asyncLogging.onMessageSend
        : false;

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        initSocket();
      },

      asyncLogger = function(type, msg) {
        Utility.asyncLogger({
          type: type,
          msg: msg,
          peerId: peerId,
          deviceId: deviceId,
          isSocketOpen: isSocketOpen,
          isDeviceRegister: isDeviceRegister,
          isServerRegister: isServerRegister,
          asyncState: asyncState,
          pushSendDataQueue: pushSendDataQueue
        });
      },

      initSocket = function() {

        socket = new PodSocketClass({socketAddress: params.socketAddress, wsConnectionWaitTime: params.wsConnectionWaitTime, connectionCheckTimeout: params.connectionCheckTimeout, connectionCheckTimeoutThreshold: params.connectionCheckTimeoutThreshold});

        checkIfSocketHasOpennedTimeoutId = setTimeout(function() {
          if (!isSocketOpen) {
            fireEvent("error", {
              errorCode: 4001,
              errorMessage: "Can not open Socket!"
            });
          }
        }, 65000);

        socket.on("open", function() {
          checkIfSocketHasOpennedTimeoutId && clearTimeout(checkIfSocketHasOpennedTimeoutId);
          socketReconnectRetryInterval && clearTimeout(socketReconnectRetryInterval);
          socketReconnectCheck && clearTimeout(socketReconnectCheck);

          isSocketOpen = true;
          retryStep = 1;
        });

        socket.on("message", function(msg) {
          handleSocketMessage(msg);
          if (onReceiveLogging) {
            asyncLogger("Receive", msg);
          }
        });

        socket.on("close", function(event) {
          isSocketOpen = false;
          isDeviceRegister = false;
          oldPeerId = peerId;
          asyncState = asyncStateType.CLOSED;
          fireEvent("disconnect", event);
          fireEvent("stateChange", asyncStateType.CLOSED);

          if (reconnectOnClose) {
            socketReconnectRetryInterval = setTimeout(function() {
              if (asyncLogging) {
                Utility.asyncStepLogger("Reconnecting after " + retryStep + "s ...");
              }
              socket.connect();
            }, 1000 * retryStep);
            retryStep *= 2;

            socketReconnectCheck && clearTimeout(socketReconnectCheck);

            socketReconnectCheck = setTimeout(function() {
              if (!isSocketOpen) {
                fireEvent("error", {
                  errorCode: 4001,
                  errorMessage: "Can not open Socket!"
                });
              }
            }, 65000);

          } else {
            socketReconnectRetryInterval && clearTimeout(socketReconnectRetryInterval);
            socketReconnectCheck && clearTimeout(socketReconnectCheck);
              fireEvent("error", {
                errorCode: 4005,
                errorMessage: "Socket Closed!"
              });
          }

        });

        socket.on("customError", function(error) {
          fireEvent("error", {
            errorCode: error.errorCode,
            errorMessage: error.errorMessage,
            errorEvent: error.errorEvent
          });
        });

        socket.on("error", function(error) {
          fireEvent("error", {
            errorCode: error.target._closeCode,
            errorMessage: error.message,
            errorEvent: error
          });
        });
      },

      handleSocketMessage = function(msg) {
        var ack;

        if (msg.type === asyncMessageType.MESSAGE_ACK_NEEDED || msg.type === asyncMessageType.MESSAGE_SENDER_ACK_NEEDED) {
          ack = function() {
            pushSendData({
              type: asyncMessageType.ACK,
              content: {
                messageId: msg.id,
              }
            });
          }
        }

        switch (msg.type) {
          case asyncMessageType.PING:
            handlePingMessage(msg);
            break;

          case asyncMessageType.SERVER_REGISTER:
            handleServerRegisterMessage(msg);
            break;

          case asyncMessageType.DEVICE_REGISTER:
            handleDeviceRegisterMessage(msg.content);
            break;

          case asyncMessageType.MESSAGE:
            fireEvent("message", msg);
            break;

          case asyncMessageType.MESSAGE_ACK_NEEDED:
          case asyncMessageType.MESSAGE_SENDER_ACK_NEEDED:
            ack();
            fireEvent("message", msg);
            break;

          case asyncMessageType.ACK:
            fireEvent("message", msg);
            if (ackCallback[msg.senderMessageId] == "function") {
              ackCallback[msg.senderMessageId]();
              delete ackCallback[msg.senderMessageId];
            }
            break;

          case asyncMessageType.ERROR_MESSAGE:
            fireEvent("error", {
              errorCode: 4002,
              errorMessage: "Async Error!",
              errorEvent: msg
            });
            break;
        }
      },

      handlePingMessage = function(msg) {
        if (msg.content) {
          if (deviceId === undefined) {
              fireEvent("error", {
                errorCode: 4003,
                errorMessage: "Device Id is not present!"
              });
          } else {
            registerDevice();
          }
        } else {
          if (asyncLogging) {
            Utility.asyncStepLogger("Ping Response at\t" + new Date());
          }
        }
      },

      registerDevice = function(isRetry) {
        if (asyncLogging) {
          Utility.asyncStepLogger("Registering Device ...");
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
        if (!isDeviceRegister) {
          if (registerDeviceTimeoutId) {
            clearTimeout(registerDeviceTimeoutId);
          }

          isDeviceRegister = true;
          peerId = recievedPeerId;
        }

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

        if (asyncLogging) {
          Utility.asyncStepLogger("Registering Server ...");
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

      handleServerRegisterMessage = function(msg) {
        if (msg.senderName && msg.senderName === serverName) {
          isServerRegister = true;

          if (registerServerTimeoutId) {
            clearTimeout(registerServerTimeoutId);
          }

          asyncState = asyncStateType.OPEN;
          fireEvent("stateChange", asyncStateType.OPEN);
          pushSendDataQueue = [];

          if (asyncLogging) {
            Utility.asyncStepLogger("Async is Ready ...");
          }

        } else {
          registerServer();
        }
      },

      pushSendData = function(msg) {
        if (onSendLogging)
          asyncLogger("Send", msg);

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
      if (eventName === "connect" && asyncState === asyncStateType.OPEN) {
        callback(peerId);
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
        }, 10);
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

    this.getAsyncState = function() {
      return asyncState;
    }

    this.getSendQueue = function() {
      return pushSendDataQueue;
    }

    this.getPeerId = function() {
      return peerId;
    }

    this.getServerName = function() {
      return serverName;
    }

    this.setServerName = function(newServerName) {
      serverName = newServerName;
    }

    this.setDeviceId = function(newDeviceId) {
      deviceId = newDeviceId;
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
