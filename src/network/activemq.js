(function() {
  /*
   * ActiveMQ Module to connect and handle ActiveMQ functionalities
   * @module ActiveMQ
   *
   * @param {Object} params
   */

  function ActiveMQ(params) {
    var Stompit = require('stompit'),
      Utility = require('../utility/utility.js');

    /*******************************************************
     *          P R I V A T E   V A R I A B L E S          *
     *******************************************************/

    var host = params.host,
      port = params.port,
      username = params.username,
      password = params.password,
      eventCallbacks = {
        "init": {},
        "error": {}
      },
      client,
      connectionStatus = false;

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        connect();
      },

      connect = function() {
        try {
          var server = {
            "host": params.host,
            "port": params.port,
            "timeout": params.timeout || 20000,
            "connectHeaders": {
              "host": "/",
              "login": params.username,
              "passcode": params.password,
              "heart-beat": "5000, 5000"
            }
          };

          var servers = [server];

          var reconnectOptions = {
            'maxReconnects': 20
          };

          var manager = new Stompit.ConnectFailover(servers, reconnectOptions);

          manager.connect(function(error, stompClient, reconnect) {
            if (error) {
              fireEvent("error", {
                errorCode: error.code,
                errorMessage: error.message,
                errorEvent: error
              });

              return;
            }

            client = stompClient;

            client.on('error', function(error) {
              fireEvent("error", {
                errorCode: 999,
                errorMessage: "ActiveMQ client has had an error",
                errorEvent: error
              });
              reconnect();
            });

            fireEvent("init");
          });

        } catch (error) {
          console.error(error);
        }
      },

      subscribe = function(params, callback) {
        if (!client) {
          fireEvent("error", {
            errorCode: 999,
            errorMessage: "ActiveMQ Client is not ready or has not been initialized!"
          });
        }

        var subscribeHeaders = {
          "destination": params.destination,
          "ack": params.ack
        };

        client.subscribe(subscribeHeaders, function(error, message) {
          if (error) {
            fireEvent("error", {
              errorCode: 999,
              errorMessage: "ActiveMQ Subscription Error!"
            });
            return;
          }

          message.readString("utf-8", function(error, body) {
            if (error) {
              fireEvent("error", {
                errorCode: 999,
                errorMessage: "ActiveMQ Read Message Error!"
              });
              return;
            }

            callback && callback(body);

            client.ack(message);
          });
        });
      },

      sendMessage = function(params) {
        var data = {
          type: params.message.type
        };

        if (params.message.trackerId) {
          data.trackerId = params.message.trackerId;
        }

        try {
          if (params.message.content) {
            data.content = JSON.stringify(params.message.content);
          }

          if (client) {
            var frame = client.send({
              "destination": params.destination
            });

            frame.write(JSON.stringify(data));
            frame.end();
          }
        } catch (error) {
          fireEvent("error", {
            errorCode: 999,
            errorMessage: "Error in ActiveMQ Send Message!",
            errorEvent: error
          });
        }
      },

      fireEvent = function(eventName, message) {
        for (var id in eventCallbacks[eventName]) {
          eventCallbacks[eventName][id](message);
        }
      };


    /*******************************************************
     *             P U B L I C   M E T H O D S             *
     *******************************************************/

    this.on = function(eventName, callback) {
      if (eventCallbacks[eventName]) {
        var id = new Utility().generateUUID();
        eventCallbacks[eventName][id] = callback;
        return id;
      }
    };

    this.sendMessage = sendMessage;

    this.subscribe = subscribe;

    this.connect = function() {
      connect();
    };

    this.disconnect = function() {
      client.disconnect();
      client = null;
    };

    this.destroy = function() {
      client.destroy();
      client = null;
    };

    this.connectionStatus = function() {
      return connectionStatus;
    }

    init();
  }

  module.exports = ActiveMQ;
})();
