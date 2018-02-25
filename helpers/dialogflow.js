'use strict';

const request = require('request');
var Promise = require('promise');

var promise = new Promise(function (resolve, reject) {
    get('http://www.google.com', function (err, res) {
        if (err) reject(err);
        else resolve(res);
    });
});

var self = {
    invokeCreateIncidentEvent: function (request_body) {
        // Send the HTTP request to the Messenger Platform
        /*request({
            "uri": "https://api.dialogflow.com/v1/query?v=20150910&e=create_incident_event&timezone=Europe/Paris&lang=en&sessionId=1234567890",
            "method": "GET",
            "headers": {
                'Authorization': 'Bearer ' + process.env.DIALOGFLOWAGENT_CLIENT_ACCESS_TOKEN
            },
        }, (err, res, body) => {
            if (!err) {
                return res;
            } else {
                console.error("Unable to send message:" + err);
            }
        });*/
        // Return new promise
        return new Promise(function (resolve, reject) {
            // Do async job
            request({
                "uri": "https://api.dialogflow.com/v1/query?v=20150910&e=create_incident_event&timezone=Europe/Paris&lang=en&sessionId=1234567890",
                "method": "GET",
                "headers": {
                    'Authorization': 'Bearer ' + process.env.DIALOGFLOWAGENT_CLIENT_ACCESS_TOKEN
                },
            }, function (err, resp, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(body);
                }
            })
        })
    }
}

module.exports = self;