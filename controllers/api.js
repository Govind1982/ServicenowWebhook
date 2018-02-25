'use strict';

var dialogflowHelper = require('../helpers/dialogflow');
const request = require('request');
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

				// Check if the event is a message or postback and
				// pass the event to the appropriate handler function
				if (webhook_event.message) {
					self.handleMessage(sender_psid, webhook_event.message);
				} else if (webhook_event.postback) {
					self.handlePostback(sender_psid, webhook_event.postback);
				}
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
			short_description: req.body.result.parameters.shortDescription,
			impact: req.body.result.parameters.impact,
			category: req.body.result.parameters.category,
		};

		gr.insert(obj).then(function (response) {
			let dataToSend = "Incident " + response.number + " is created. Please note for future reference";
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
	},
	// Handles messages events
	handleMessage: function (sender_psid, received_message) {
		let response;

		// Check if the message contains text
		if (received_message.text) {
			// Create the payload for a basic text message
			response = {
				attachment: {
					'type': 'template',
					'payload': {
						'template_type': 'generic',
						'elements': [
							{
								'title': 'Please choose an item',
								'image_url': 'https://diginomica.com/wp-content/uploads/2015/01/servicenow.jpeg',
								'buttons': [
									{
										'type': 'postback',
										'title': 'Create Incident',
										'payload': 'CREATE_INCIDENT'
									},
									{
										'type': 'postback',
										'title': 'Get Incident Status',
										'payload': 'GET_INCIDENT_STATUS'
									}
								]
							}
						]
					}
				}
			}
		}

		// Sends the response message
		self.callSendAPI(sender_psid, response);
	},
	// Handles messaging_postbacks events
	handlePostback: function (sender_psid, received_postback) {
		let response;

		// Get the payload for the postback
		let payload = received_postback.payload;
		switch (payload) {
			case "CREATE_INCIDENT":
				res = dialogflowHelper.invokeCreateIncidentEvent();
				break;
			case "GET_INCIDENT_STATUS":

				break;
		}


		response = {
			"text": res.body.fulfillment.speech
		};




		self.callSendAPI(sender_psid, response);
	},
	// Sends response messages via the Send API
	callSendAPI: function (sender_psid, response) {
		// Construct the message body
		let request_body = {
			"recipient": {
				"id": sender_psid
			},
			"message": response
		}

		// Send the HTTP request to the Messenger Platform
		request({
			"uri": "https://graph.facebook.com/v2.6/me/messages",
			"qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
			"method": "POST",
			"json": request_body
		}, (err, res, body) => {
			if (!err) {
				console.log('message sent!')
			} else {
				console.error("Unable to send message:" + err);
			}
		});
	}
}

module.exports = self;