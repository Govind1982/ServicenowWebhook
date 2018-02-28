'use strict';

var apiai = require('apiai');
const request = require('request');
const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord(process.env.SERVICENOW_INSTANCE, process.env.SERVICENOW_TABLE, process.env.SERVICENOW_USERNAME, process.env.SERVICENOW_PASSWORD, process.env.SERVICENOW_API_VERSION);
const apiaiApp = apiai(process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN);

var self = {
	webhookEndpoint: function (req, res) {
		if (req.body.object === 'page') {
			req.body.entry.forEach((entry) => {
				entry.messaging.forEach((event) => {
					let sender = event.sender.id;
					if (event.message && event.message.text) {
						let text = event.message.text;
						self.sendMessage(event, sender, text);
					} else if (event.postback && event.postback.payload) {
						switch (event.postback.payload) {
							case "CREATE_INCIDENT":
								self.invokeCreateIncidentEvent(sender);
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
	sendMessage: function (event, sender, text) {

		let apiai = apiaiApp.textRequest(text, {
			sessionId: '1234567890'
		});

		apiai.on('response', (response) => {
			console.log("textrequest response below");
			console.log(response);
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
				}, (error, resp) => {
					if (error) {
						console.log('Error sending message: ', error);
					} else if (resp.body.error) {
						console.log('Error: ', resp.body.error);
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
			}, (error, res) => {
				if (error) {
					console.log('Error sending message: ', error);
					reject(error);
				} else if (res.body.error) {
					console.log('Error: ', res.body.error);
					reject(new Error(res.body.error));
				}
				resolve();
			});
		});
	},
	invokeCreateIncidentEvent: function (sender) {
		var eventInfo = {
			name: "create_incident_event"
		};

		var options = {
			sessionId: '1234567890'
		};

		var apiai = apiaiApp.eventRequest(eventInfo, options);
		apiai.on('response', function (response) {
			console.log("eventrequest response below");
			console.log(response);
			if (self.isDefined(response.result) && self.isDefined(response.result.fulfillment)) {
				let responseText = response.result.fulfillment.speech;
				request({
					url: 'https://graph.facebook.com/v2.6/me/messages',
					qs: { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
					method: 'POST',
					json: {
						recipient: { id: sender },
						message: { text: responseText }
					}
				}, (error, res) => {
					if (error) {
						console.log('Error sending message: ', error);
					} else if (res.body.error) {
						console.log('Error: ', res.body.error);
					}
				});

			}
		});

		apiai.on('error', function (error) {
			console.log(error);
		});

		apiai.end();
	},
	showCategoryChoices: function (event, responseText) {
		let messageData = {
			"text": responseText,
			"quick_replies": [
				{
					"inquiry/Help": "inquiry/Help",
					"Software": "Software",
					"Hardware": "Hardware",
					"Network": "Network",
					"Database": "Database"
				},
				{
					"content_type": "location"
				}
			]
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
	},
	isDefined: function (obj) {
		if (typeof obj == 'undefined') {
			return false;
		}

		if (!obj) {
			return false;
		}

		return obj != null;
	}
}

module.exports = self;
