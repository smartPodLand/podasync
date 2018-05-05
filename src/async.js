(function() {
  /*
   * Async module to handle async messaging
   * @constructor
   * @module Async
   *
   * @param {Object} params
   */

  function Async(params) {

    /*******************************************************
     *          P R I V A T E   V A R I A B L E S          *
     *******************************************************/

    var PodSocketClass;

    if (typeof(require) !== "undefined" && typeof(exports) !== "undefined") {
      PodSocketClass = require('./socket.js');
    } else {
      PodSocketClass = POD.Socket;
    }

    var appId = params.appId || "POD-Chat",
      deviceId,
      address = params.socketAddress,
      eventCallbacks = {
        connect: {},
        disconnect: {},
        reconnect: {},
        message: {},
        asyncReady: {}
      },
      ackCallback = {
        /**
         * MessageId
         */
      },
      socket,
      isSocketOpen = false,
      isDeviceRegister = false,
      isServerRegister = false,
      connectionState = false,
      registerServerTimeoutId,
      registerDeviceTimeoutId,
      asyncReadyTimeoutId,
      pushSendDataQueue = [],
      oldPeerId,
      peerId = params.peerId,
      lastMessageId = 1,
      messageTtl = params.messageTtl,
      serverName = params.serverName || "oauth-wire",
      connectionRetryInterval = params.connectionRetryInterval;

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        initSocket();
      },

      logger = function() {
        console.log("\n################################################################");
        console.log("################### S O C K E T   S T A T S ####################");
        console.log("################################################################");
        console.log("### Peer Id\t\t", peerId);
        console.log("### Device Id\t\t", deviceId);
        console.log("### is Socket Open\t", isSocketOpen);
        console.log("### is Device Register\t", isDeviceRegister);
        console.log("### is Server Register\t", isServerRegister);
        console.log("### Connection State\t", connectionState);
        console.log("### Send Queue\t\t", pushSendDataQueue);
        console.log("################################################################\n");
      },

      initSocket = function() {
        setTimeout(function() {
          if (!isSocketOpen) {
            console.log(":::::::::::::: Error :: Can Not Open Socket!");
          }
        }, 60000);

        socket = new PodSocketClass(params);

        socket.on("message", function(params) {
          handleSocketMessage(params);
        });

        socket.on("open", function() {
          isSocketOpen = true;
          registerDevice();
        });

        socket.on("close", function(event) {
          isSocketOpen = false;
          isDeviceRegister = false;
          oldPeerId = peerId;

          // if (connectionState) {
          connectionState = false;
          // peerId = undefined;

          /**
             *  Firing Disconnect Event From Outer Class
             *  Will be used in chatClass
             */
          // fireEvent("disconnect", event);
          // }

          if (event) {
            switch (event.code) {
             /**
              * User Logout
              */
              case 4001:
                peerId = undefined;
                deviceId = undefined;
                isServerRegister = false;
                break;

             /**
              * Socket Closed by User
              */
              case 4002:
                break;

             /**
              * Socket Closed on its own
              */
              case 4106:
                break;

              default:
                break;
            }
          }

          setTimeout(function() {
            setTimeout(function() {
              if (!isSocketOpen) {
                console.log("\n:::::::::::: Error :: Can Not Open Socket!");
              }
            }, 60000);
            socket.connect();
          }, 1000);
        });

        socket.on("error", function(error) {
          console.log(error);
        });
      },

      handleSocketMessage = function(msg) {
        let ack;

        if (msg.type === 4 || msg.type === 5) {
          ack = function() {
            pushSendData({
              type: 6,
              content: {
                receivers: [msg.senderId],
                messageId: msg.id
              }
            });
          }
        }

        switch (msg.type) {
          case 0:
            if (msg.content && deviceId === undefined) {
              deviceId = msg.content;
              console.log("\n:::::::::::::: First Device ID => \t" + msg.content + "\n");
            }
            console.log(":::: PONG at \t" + new Date());
            break;

          case 1:
            handleServerRegisterMessage(msg, ack);
            break;

          case 2:
            handleDeviceRegisterMessage(msg.content);
            break;

          case 3:
          case 4:
          case 5:
            fireEvent("message", msg, ack);
            break;

          case 6:
            if (ackCallback[msg.senderMessageId] == "function") {
              ackCallback[msg.senderMessageId]();
              delete ackCallback[msg.senderMessageId];
            }
            break;
        }
      },

      registerDevice = function(isRetry) {
        console.log("\n:::::::::::::: Registering Device ...\n");
        let content = {
          appId: appId,
          deviceId: deviceId
        };

        if (peerId !== undefined && typeof peerId === "number") {
          content.refresh = true;
        } else {
          if (!isRetry) {
            content.renew = true;
          }
        }

        socket.emit({type: 2, content: content});

        registerDeviceTimeoutId = setTimeout(function() {
          if (!isDeviceRegister) {
            console.log("\n:::::::::::::: Device Register Failed, Retrying registration ...\n");
            registerDevice(true);
          }
        }, connectionRetryInterval);
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
          connectionState = true;
          isServerRegister = true;
          pushSendDataQueueHandler();
        } else {
          registerServer();
        }
      },

      registerServer = function() {
        console.log("\n:::::::::::::: Registering Server ...\n");

        let content = {
          name: serverName
        };

        socket.emit({type: 1, content: content});

        registerServerTimeoutId = setTimeout(function() {
          if (!isServerRegister) {
            console.log("\n:::::::::::::: Server Register Failed, Retrying registration ...\n");
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
          connectionState = true;

          pushSendDataQueueHandler();
          /**
           * Handle Sending Message from outer class
           */
          fireEvent("message", msg, ack);
          console.log("\n:::::::::::::: Ready for chat ...\n");
        } else {
          registerServer();
        }
      },

      pushSendData = function(msg) {
        logger();
        if (connectionState) {
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
        while (pushSendDataQueue.length > 0 && connectionState) {
          let msg = pushSendDataQueue.splice(0, 1)[0];
          pushSendData(msg);
        }
      },

      /**
       * Make calling function from outer classes possible
       */
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
        let id = new Date().getTime();
        eventCallbacks[eventName][id] = callback;
        return id;
      }

      if (eventName === "connect" && connectionState) {
        callback(peerId);
      }
    }

    this.emit = function(params, callback) {
      /*
       *  TYPE 3 => Message
       *  TYPE 4 => Message ACK Needed
       *  TYPE 5 => Message Sender ACK Needed
       */

      let messageType = (typeof params.type === "number")
        ? params.type
        : (callback)
          ? 5
          : 3;

      let socketData = {
        type: messageType,
        content: params.content
      };

      if (messageType === 5 || messageType === 4) {
        lastMessageId += 1;
        let messageId = lastMessageId;

        ackCallback[messageId] = function() {
          callback && callback();
        }

        socketData.content.messageId = messageId;
        socketData.content.ttl = messageTtl;
      }

      pushSendData(socketData);
    }

    this.asyncReady = function(callback) {
      if (asyncReadyTimeoutId)
        clearTimeout(asyncReadyTimeoutId);

      if (connectionState) {
        callback();
      } else {
        asyncReadyTimeoutId = setTimeout(function() {
          if (connectionState) {
            callback();
          } else {
            this.asyncReady(callback);
          }
        }, 1000);
      }
    }

    this.getSocketConnectionState = function() {
      return connectionState;
    }

    this.getSendQueue = function() {
      return pushSendDataQueue;
    }

    this.getPeerId = function() {
      return peerId;
    }

    this.close = function() {
      connectionState = false;
      isDeviceRegister = false;
      isSocketOpen = false;
      socket.close();
    }

    this.logout = function(params) {
      oldPeerId = peerId;
      peerId = undefined;
      isServerRegister = false;
      isDeviceRegister = false;
      isSocketOpen = false;
      connectionState = false;
      clearTimeouts();
      socket.logout();
    }

    this.reconnectSocket = function() {
      oldPeerId = peerId;
      isDeviceRegister = false;
      isSocketOpen = false;
      connectionState = false;
      clearTimeouts();
      socket.close();
    }

    init();
  }

  if (typeof exports !== undefined && module.exports) {
    module.exports = Async;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Async = Async;
  }
})();
