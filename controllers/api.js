'use strict';

const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord(process.env.SERVICENOW_INSTANCE, process.env.SERVICENOW_TABLE, process.env.SERVICENOW_USERNAME, process.env.SERVICENOW_PASSWORD, process.env.SERVICENOW_API_VERSION);

var self = {
	processIncident: function (req, res) {
		switch (req.body.result.action) {
			case "getIncidentStatus":
				self.getIncidentStatus(req, res);
				break;
			case "createIncident":
				self.createIncident(req, res);
				break;
		}
	},
	webhookEndpoint: function (req, res) {
		let body = req.body;

		// Checks this is an event from a page subscription
		if (body.object === 'page') {

			// Iterates over each entry - there may be multiple if batched
			body.entry.forEach(function (entry) {

				// Gets the body of the webhook event
				let webhook_event = entry.messaging[0];
				console.log(webhook_event);

				// Get the sender PSID
				let sender_psid = webhook_event.sender.id;
				console.log('Sender PSID: ' + sender_psid);
			});

			// Returns a '200 OK' response to all requests
			res.status(200).send('EVENT_RECEIVED');
		} else {
			// Returns a '404 Not Found' if event is not from a page subscription
			res.sendStatus(404);
		}
	},
	webhookVerification: function (req, res) {
		// Your verify token. Should be a random string.
		let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

		// Parse the query params
		let mode = req.query['hub.mode'];
		let token = req.query['hub.verify_token'];
		let challenge = req.query['hub.challenge'];

		// Checks if a token and mode is in the query string of the request
		if (mode && token) {

			// Checks the mode and token sent is correct
			if (mode === 'subscribe' && token === VERIFY_TOKEN) {

				// Responds with the challenge token from the request
				console.log('WEBHOOK_VERIFIED');
				res.status(200).send(challenge);

			} else {
				// Responds with '403 Forbidden' if verify tokens do not match
				res.sendStatus(403);
			}
		}
	},
	getIncidentStatus: function (req, res) {
		let sysId = req.body.result.parameters.sysid;
		gr.get(sysId).then(function (result) {
			let dataToSend = (result.active === "true") ? "Incident status is active" : "Incident status is inactive";
			return res.json({
				speech: dataToSend,
				displayText: dataToSend,
				source: '/incident/getstatus'
			});
		}).catch(function (error) {
			return res.json({
				speech: 'Something went wrong!',
				displayText: 'Something went wrong!',
				source: '/incident/getstatus'
			});
		});
	},
	createIncident: function (req, res) {
		var obj = {
			short_description: req.body.result.parameters.shortdesc,
			description: req.body.result.parameters.description,
			priority: 1
		};

		gr.insert(obj).then(function (response) {
			let dataToSend = "Incident created with sys id:" + response.sys_id;
			return res.json({
				speech: dataToSend,
				displayText: dataToSend,
				source: '/incident/create'
			});
		}).catch(function (error) {
			return res.json({
				speech: 'Something went wrong!',
				displayText: 'Something went wrong!',
				source: '/incident/create'
			});
		});
	}
}

module.exports = self;