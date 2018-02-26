'use strict';

require('../libraries/FacebookBot');
var apiai = require('apiai');
const request = require('request');
const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord(process.env.SERVICENOW_INSTANCE, process.env.SERVICENOW_TABLE, process.env.SERVICENOW_USERNAME, process.env.SERVICENOW_PASSWORD, process.env.SERVICENOW_API_VERSION);
let facebookBot = new FacebookBot();


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
		try {
			const data = JSONbig.parse(req.body);

			if (data.entry) {
				let entries = data.entry;
				entries.forEach((entry) => {
					let messaging_events = entry.messaging;
					if (messaging_events) {
						messaging_events.forEach((event) => {
							if (event.message && !event.message.is_echo) {

								if (event.message.attachments) {
									let locations = event.message.attachments.filter(a => a.type === "location");

									// delete all locations from original message
									event.message.attachments = event.message.attachments.filter(a => a.type !== "location");

									if (locations.length > 0) {
										locations.forEach(l => {
											let locationEvent = {
												sender: event.sender,
												postback: {
													payload: "FACEBOOK_LOCATION",
													data: l.payload.coordinates
												}
											};

											facebookBot.processFacebookEvent(locationEvent);
										});
									}
								}

								facebookBot.processMessageEvent(event);
							} else if (event.postback && event.postback.payload) {
								if (event.postback.payload === "FACEBOOK_WELCOME") {
									facebookBot.processFacebookEvent(event);
								} else {
									facebookBot.processMessageEvent(event);
								}
							}
						});
					}
				});
			}

			return res.status(200).json({
				status: "ok"
			});
		} catch (err) {
			return res.status(400).json({
				status: "error",
				error: err
			});
		}

	},
	webhookVerification: function (req, res) {
		if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
			res.send(req.query['hub.challenge']);

			setTimeout(() => {
				facebookBot.doSubscribeRequest();
			}, 3000);
		} else {
			res.send('Error, wrong validation token');
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
	handleMessage: function (webhook_event) {
		let response;

		// Check if the message contains text
		if (webhook_event.text) {
			// Create the payload for a basic text message
			/*response = {
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
			}*/
		}

		// Sends the response message
		self.callSendAPI(event);
	},
	// Handles messaging_postbacks events
	handlePostback: function (event) {
		let response;
		// Get the payload for the postback
		let payload = event.payload;
		switch (payload) {
			case "CREATE_INCIDENT":
				//res = dialogflowHelper.invokeCreateIncidentEvent();
				response = {
				}
				break;
			case "GET_INCIDENT_STATUS":

				break;
		}
		//self.callSendAPI(event);
	},
	
}

module.exports = self;
