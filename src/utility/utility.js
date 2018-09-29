(function() {
  /**
   * General Utilities
   */
  function Utility() {
    /**
     * Checks if Client is using NodeJS or not
     * @return {boolean}
     */
    this.isNode = function() {
      // return (typeof module !== 'undefined' && typeof module.exports != "undefined");
      return (typeof global !== "undefined" && ({}).toString.call(global) === '[object global]');
    }

    /**
     * Generates Random String
     * @param   {int}     sectionCount
     * @return  {string}
     */
    this.generateUUID = function(sectionCount) {
      var d = new Date().getTime();
      var textData = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

      if (sectionCount == 1) {
        textData = 'xxxxxxxx';
      }

      if (sectionCount == 2) {
        textData = 'xxxxxxxx-xxxx';
      }

      if (sectionCount == 3) {
        textData = 'xxxxxxxx-xxxx-4xxx';
      }

      if (sectionCount == 4) {
        textData = 'xxxxxxxx-xxxx-4xxx-yxxx';
      }

      var uuid = textData.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);

        return (
          c == 'x' ?
          r :
          (r & 0x7 | 0x8)).toString(16);
      });
      return uuid;
    };

    /**
     * Prints Socket Status on Both Browser and Linux Terminal
     * @param {object} params Socket status + current msg + send queue
     * @return
     */
    this.asyncLogger = function(params) {
      var type = params.type,
        msg = params.msg,
        peerId = params.peerId,
        deviceId = params.deviceId,
        isSocketOpen = params.isSocketOpen,
        isDeviceRegister = params.isDeviceRegister,
        isServerRegister = params.isServerRegister,
        socketState = params.socketState,
        pushSendDataQueue = params.pushSendDataQueue,
        workerId = params.workerId,
        BgColor;

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

      if (typeof global !== "undefined" && ({}).toString.call(global) === '[object global]') {
        console.log("\n");
        console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
        console.log("\x1b[" + BgColor + "m\x1b[8m##################\x1b[0m\x1b[37m\x1b[" + BgColor + "m S O C K E T    S T A T U S \x1b[0m\x1b[" + BgColor + "m\x1b[8m##################\x1b[0m");
        console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t\t\t\t\t\t\t      \x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " PEER ID\t\t", peerId);
        if (workerId > 0) {
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " WORKER ID\t\t", workerId);
        }
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " DEVICE ID\t\t", deviceId);
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " IS SOCKET OPEN\t", isSocketOpen);
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " DEVICE REGISTER\t", isDeviceRegister);
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " SERVER REGISTER\t", isServerRegister);
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m", " SOCKET STATE\t", socketState);
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
                console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t   \x1b[1m•\x1b[0m \x1b[35m%s\x1b[0m : \x1b[36m%s\x1b[0m", k, JSON.stringify(pushSendDataQueue[key][k]));
              });
            } else {
              console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t \x1b[1m•\x1b[0m \x1b[35m%s\x1b[0m : \x1b[33m%s\x1b[0m", key, pushSendDataQueue[key]);
            }
          });

        } else {
          console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \x1b[2m%s\x1b[0m \x1b[1m%s\x1b[0m ", " SEND QUEUE\t\t", "Empty");
        }

        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t\t\t\t\t\t\t      \x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
        console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
        console.log("\n");
      } else {
        console.log("\n");
        console.log("%cS O C K E T    S T A T U S", 'background: ' + ColorCSS + '; padding: 10px 142px; font-weight: bold; font-size: 18px; color: #fff;');
        console.log("\n");
        console.log("%c   PEER ID\t\t %c" + peerId, 'color: #444', 'color: #ffac28; font-weight: bold');
        console.log("%c   DEVICE ID\t\t %c" + deviceId, 'color: #444', 'color: #ffac28; font-weight: bold');
        console.log("%c   IS SOCKET OPEN\t %c" + isSocketOpen, 'color: #444', 'color: #ffac28; font-weight: bold');
        console.log("%c   DEVICE REGISTER\t %c" + isDeviceRegister, 'color: #444', 'color: #ffac28; font-weight: bold');
        console.log("%c   SERVER REGISTER\t %c" + isServerRegister, 'color: #444', 'color: #ffac28; font-weight: bold');
        console.log("%c   SOCKET STATE\t\t %c" + socketState, 'color: #444', 'color: #ffac28; font-weight: bold');
        console.log("%c   CURRENT MESSAGE\t %c" + type, 'color: #444', 'color: #aa386d; font-weight: bold');
        console.log("\n");

        Object.keys(msg).forEach(function(key) {
          if (typeof msg[key] === 'object') {
            console.log("%c \t-" + key, 'color: #777');
            Object.keys(msg[key]).forEach(function(k) {
              console.log("%c \t  •" + k + " : %c" + msg[key][k], 'color: #777', 'color: #f23; font-weight: bold');
            });
          } else {
            console.log("%c \t•" + key + " : %c" + msg[key], 'color: #777', 'color: #f23; font-weight: bold');
          }
        });

        console.log("\n");

        if (pushSendDataQueue.length > 0) {
          console.log("%c   SEND QUEUE", 'color: #444');
          console.log("\n");
          Object.keys(pushSendDataQueue).forEach(function(key) {
            if (typeof pushSendDataQueue[key] === 'object') {
              console.log("%c \t-" + key, 'color: #777');
              Object.keys(pushSendDataQueue[key]).forEach(function(k) {
                console.log("%c \t  •" + k + " : %c" + JSON.stringify(pushSendDataQueue[key][k]), 'color: #777', 'color: #999; font-weight: bold');
              });
            } else {
              console.log("%c \t•" + key + " : %c" + pushSendDataQueue[key], 'color: #777', 'color: #999; font-weight: bold');
            }
          });

        } else {
          console.log("%c   SEND QUEUE\t\t %cEmpty", 'color: #444', 'color: #000; font-weight: bold');
        }

        console.log("\n");
        console.log("%c ", 'font-weight: bold; font-size: 3px; border-left: solid 540px ' + ColorCSS + ';');
        console.log("\n");
      }
    }

    /**
     * Prints Custom Message in console
     * @param {string} message Message to be logged in terminal
     * @return
     */
    this.asyncStepLogger = function(message) {
      if (typeof navigator == "undefined") {
        console.log("\x1b[90m    ☰ \x1b[0m\x1b[90m%s\x1b[0m", message);
      } else {
        console.log("%c   " + message, 'border-left: solid #666 10px; color: #666;');
      }
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
    module.exports = Utility;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Utility = Utility;
  }
})();
