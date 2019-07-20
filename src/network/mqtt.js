(function() {
    /*
     * MQTT Module to connect and handle MQTT functionalities
     * @module MQTT
     *
     * @param {Object} params
     */

    function MQTT(params) {
        var mqtt = require('mqtt'),
            Utility = require('../utility/utility.js');

        /*******************************************************
         *          P R I V A T E   V A R I A B L E S          *
         *******************************************************/

        var eventCallbacks = {
                'connect': {},
                'message': {},
                'error': {}
            },
            client;

        /*******************************************************
         *            P R I V A T E   M E T H O D S            *
         *******************************************************/

        var init = function() {
                connect();
            },

            connect = function() {
                try {
                    client = mqtt.connect(params);

                    client.on('connect', function() {
                        fireEvent('connect');
                    });

                    client.on('message', function(topic, message) {
                        fireEvent('message', message.toString());
                    });

                    // client.on('packetsend', function(packet) {
                    //     console.log('Packet Sent', packet);
                    // });
                    //
                    // client.on('packetreceive', function(packet) {
                    //     console.log('Packet Received', packet);
                    // });

                    client.on('error', function(err) {
                        fireEvent('error', err);
                    });
                }
                catch (error) {
                    fireEvent('error', error);
                }
            },

            subscribe = function(params, callback) {
                if (!client) {
                    fireEvent('error', {
                        errorCode: 999,
                        errorMessage: 'MQTT Client is not ready or has not been initialized!'
                    });
                    return;
                }

                client.subscribe(params.destination, function(err, granted) {
                    if (!err) {
                        // fireEvent("init");
                        callback && callback(err, granted);
                    }
                    else {
                        if (err) {
                            fireEvent('error', {
                                errorCode: 999,
                                errorMessage: 'MQTT Subscription Error!',
                                error: err
                            });
                            return;
                        }
                    }
                });
            },

            unsubscribe = function(params, callback) {
                if (!client) {
                    fireEvent('error', {
                        errorCode: 999,
                        errorMessage: 'MQTT Client is not ready or has not been initialized!'
                    });
                    return;
                }

                client.unsubscribe(params.destination, {}, function(err) {
                    if (!err) {
                        callback && callback();
                    }
                    else {
                        if (err) {
                            fireEvent('error', {
                                errorCode: 999,
                                errorMessage: 'MQTT Unsubscription Error!',
                                error: err
                            });
                            return;
                        }
                    }
                });
            },

            end = function(params, callback) {
                if (!client) {
                    fireEvent('error', {
                        errorCode: 999,
                        errorMessage: 'MQTT Client is not ready or has not been initialized!'
                    });
                    return;
                }

                var force = (params && typeof params.force == 'boolean') ? params.force : false;
                var options = (params && typeof params.options == 'object') ? params.force : {};

                client.end(force, options, function() {
                    callback && callback();
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
                        client.publish(params.destination, JSON.stringify(data), {}, function(err) {
                            if (err) {
                                fireEvent('error', {
                                    errorCode: 999,
                                    errorMessage: 'Error in MQTT Send Message!',
                                    errorEvent: err
                                });
                            }
                        });
                    }
                }
                catch (error) {
                    fireEvent('error', {
                        errorCode: 999,
                        errorMessage: 'Error in MQTT Send Message!',
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

        this.unsubscribe = unsubscribe;

        this.end = end;

        this.connect = connect;

        this.reconnect = function() {
            if (!client) {
                fireEvent('error', {
                    errorCode: 999,
                    errorMessage: 'MQTT Client is not ready or has not been initialized!'
                });
                return;
            }

            client.reconnect();
        };

        this.connectionStatus = function() {
            return client.connected;
        };

        init();
    }

    if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
        module.exports = MQTT;
    } else {
        if (!window.PodAsync) {
            window.PodAsync = {};
        }
        window.PodAsync.MQTT = MQTT;
    }
})();
