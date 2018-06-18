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
      return (typeof module !== 'undefined' && typeof module.exports != "undefined");
    }

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
        asyncState = params.asyncState,
        pushSendDataQueue = params.pushSendDataQueue,
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

      if (this.isNode()) {
        console.log("\n");
        console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
        console.log("\x1b[" + BgColor + "m\x1b[8m###################\x1b[0m\x1b[37m\x1b[" + BgColor + "mS O C K E T    S T A T U S\x1b[0m\x1b[" + BgColor + "m\x1b[8m###################\x1b[0m");
        console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t\t\t\t\t\t\t      \x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
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

        console.log("\x1b[" + BgColor + "m\x1b[8m##\x1b[0m \t\t\t\t\t\t\t      \x1b[" + BgColor + "m\x1b[8m##\x1b[0m");
        console.log("\x1b[" + BgColor + "m\x1b[8m%s\x1b[0m", "################################################################");
        console.log("\n");
      } else {
        console.log("\n");
        console.log("%cS O C K E T    S T A T U S", 'background: ' + ColorCSS + '; padding: 10px 142px; font-weight: bold; font-size: 18px; color: #fff;');
        console.log("%c\t\t\t\t\t\t\t\t\t\t", 'padding-bottom: 8px;border-left: solid 10px ' + ColorCSS + ';border-right: solid 10px ' + ColorCSS);
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

        console.log("%c\t\t\t\t\t\t\t\t\t\t", 'padding-bottom: 6px;border-left: solid 10px ' + ColorCSS + ';border-right: solid 10px ' + ColorCSS);
        console.log("%c\t\t\t\t\t\t\t\t\t\t", 'border-top: solid 10px ' + ColorCSS);
      }
    }

    /**
     * Prints Custom Message in console
     * @param {string} message Message to be logged in terminal
     * @return
     */
    this.asyncStepLogger = function(message) {
      if (this.isNode()) {
        console.log("\x1b[46m\x1b[8m##\x1b[0m  \x1b[36m%s\x1b[0m", message);
      } else {
        console.log("%c   " + message, 'border-left: solid #08bbdb 10px; color: #08bbdb;');
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
