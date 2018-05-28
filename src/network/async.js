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
      http = require('http');
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
      token = params.token,
      ssoGrantDevicesAddress = params.ssoGrantDevicesAddress,
      ssoHost = params.ssoHost,
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
        Utility.consoleLogger({
          type: type,
          msg: msg,
          peerId: peerId,
          token: token,
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
            throw new Error("Can Not Open Socket!");
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
            logger("Receive", msg);
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
              if (consoleLogging) {
                Utility.stepLogger("Reconnecting after " + retryStep + "s ...");
              }
              socket.connect();
            }, 1000 * retryStep);
            retryStep *= 2;

            socketReconnectCheck && clearTimeout(socketReconnectCheck);

            socketReconnectCheck = setTimeout(function() {
              if (!isSocketOpen) {
                // throw new Error("Can Not Open Socket!");
                console.log("Can Not Open Socket!");
              }
            }, 65000);

          } else {
            socketReconnectRetryInterval && clearTimeout(socketReconnectRetryInterval);
            socketReconnectCheck && clearTimeout(socketReconnectCheck);
            // throw new Error("Socket Closed!");
            // console.log("Socket Closed!");
          }

        });

        socket.on("error", function(error) {
          console.log(error);
          // throw new Error(error);
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
            handlePingMessage(msg);
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
            // ack();
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

      getDeviceIdWithToken = function(callback) {

        if (isNode) {
          var options = {
            host: ssoHost,
            path: ssoGrantDevicesAddress,
            method: "GET",
            headers: {
              "Authorization": "Bearer " + token
            }
          };

          http.get(options, function(response) {
            var resultText = '';

            response.on('data', function(data) {
              resultText += data;
            });

            response.on('end', function() {
              var devices = JSON.parse(resultText).devices;
              if (devices.length > 0) {
                for (var i = 0; i < devices.length; i++) {
                  if (devices[i].current) {
                    deviceId = devices[i].uid;
                    break;
                  }
                }

                if (!deviceId) {
                  // throw new Error("Token is invalid");
                  console.log("Token is invalid");
                } else {
                  callback();
                }
              }
            });
          });

        } else {
          var request = new XMLHttpRequest();
          request.open("GET", "http://" + ssoHost + ssoGrantDevicesAddress, true);
          request.setRequestHeader("Authorization", "Bearer " + token);
          request.send();

          request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
              var response = request.responseText;

              var devices = JSON.parse(response).devices;

              if (devices.length > 0) {
                for (var i = 0; i < devices.length; i++) {
                  if (devices[i].current) {
                    deviceId = devices[i].uid;
                    break;
                  }
                }

                if (!deviceId) {
                  // throw new Error("Token is invalid");
                  console.log("Token is invalid");
                } else {
                  callback();
                }
              }
            }
          }
        }
      },

      handlePingMessage = function(msg) {
        if (msg.content) {
          if (deviceId === undefined) {
            getDeviceIdWithToken(function() {
              if (consoleLogging) {
                Utility.stepLogger("Device ID =>\t" + deviceId);
              }
              registerDevice();
            });
          } else {
            if (!isDeviceRegister) {
              registerDevice();
            } else {
              if (isServerRegister && peerId === oldPeerId) {
                asyncState = asyncStateType.OPEN;
                fireEvent("stateChange", asyncStateType.OPEN);
                isServerRegister = true;
                pushSendDataQueueHandler();
              } else {
                registerServer();
              }
            }
          }
        } else {
          if (consoleLogging) {
            Utility.stepLogger("Ping Response at\t" + new Date());
          }
        }
      },

      registerDevice = function(isRetry) {
        if (consoleLogging) {
          Utility.stepLogger("Registering Device ...");
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

        if (consoleLogging) {
          Utility.stepLogger("Registering Server ...");
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
            Utility.stepLogger("Async is Ready ...");
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

    this.setToken = function(newToken) {
      token = newToken;
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
