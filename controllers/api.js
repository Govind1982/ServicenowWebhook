'use strict';

var apiai = require('apiai');
const request = require('request');
const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord(process.env.SERVICENOW_INSTANCE, process.env.SERVICENOW_TABLE, process.env.SERVICENOW_USERNAME, process.env.SERVICENOW_PASSWORD, process.env.SERVICENOW_API_VERSION);
const apiaiApp = apiai(process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN);

var self = {
	webhookEndpoint: function (req, res) {
		console.log(req.body);
		if (req.body.object === 'page') {
			req.body.entry.forEach((entry) => {
				entry.messaging.forEach((event) => {
					if (event.message && event.message.text) {
						self.sendMessage(event);
					} else if (event.postback && event.postback.payload) {
						switch (event.postback.payload) {
							case "CREATE_INCIDENT":
								var event = {
									name: "create_incident_event"
								};

								var options = {
									sessionId: '1234567890'
								};

								var apiai = apiaiApp.eventRequest(event, options);

								apiai.on('response', function (response) {
									console.log(util.inspect(response.messaging, false, null));
								});

								apiai.on('error', function (error) {
									console.log(error);
								});
								break;
						}
					}
				});
			});
			res.status(200).end();
		}
	},
	webhookVerification: function (req, res) {
		let VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
		if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
			res.send(req.query['hub.challenge']);
		} else {
			res.send('Error, wrong validation token');
		}
	},
	sendMessage: function (event) {
		let sender = event.sender.id;
		let text = event.message.text;

		let apiai = apiaiApp.textRequest(text, {
			sessionId: '1234567890'
		});

		apiai.on('response', (response) => {
			if (response.result.action === "input.welcome") {
				self.dislplayWelcomeCard(event);
			} else {
				let aiText = response.result.fulfillment.speech;

				request({
					url: 'https://graph.facebook.com/v2.6/me/messages',
					qs: { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
					method: 'POST',
					json: {
						recipient: { id: sender },
						message: { text: aiText }
					}
				}, (error, response) => {
					if (error) {
						console.log('Error sending message: ', error);
					} else if (response.body.error) {
						console.log('Error: ', response.body.error);
					}
				});
			}
		});

		apiai.on('error', (error) => {
			console.log(error);
		});

		apiai.end();
	},
	sendRichContentResponse: function (event, messageData) {
		let sender = event.sender.id;
		return new Promise((resolve, reject) => {
			request({
				url: 'https://graph.facebook.com/v2.6/me/messages',
				qs: { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
				method: 'POST',
				json: {
					recipient: { id: sender },
					message: messageData
				}
			}, (error, response) => {
				if (error) {
					console.log('Error sending message: ', error);
					reject(error);
				} else if (response.body.error) {
					console.log('Error: ', response.body.error);
					reject(new Error(response.body.error));
				}

				resolve();
			});
		});
	},
	invokeCreateIncidentEvent: function (event) {
		let messageData = {
			"followupEvent": {
				"name": "create_incident_event"
			}
		};
		self.sendRichContentResponse(event, messageData);
	},
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
	dislplayWelcomeCard: function (event) {
		let messageData = {
			"attachment": {
				"type": "template",
				"payload": {
					"template_type": "generic",
					"elements": [
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
		};
		self.sendRichContentResponse(event, messageData)
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
	}
}

module.exports = self;
