'use strict';

var apiai = require('apiai');
var dateFormat = require('dateformat');
var fs = require('fs');
const request = require('request');
const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord(process.env.SERVICENOW_INSTANCE, process.env.SERVICENOW_TABLE, process.env.SERVICENOW_USERNAME, process.env.SERVICENOW_PASSWORD, process.env.SERVICENOW_API_VERSION);
const apiaiApp = apiai(process.env.DIALOGFLOWAGENT_CLIENT_ACCESS_TOKEN);
var CircularJSON = require('circular-json');

var self = {
	webhookEndpoint: function (req, res) {
		if (req.body.object === 'page') {
			req.body.entry.forEach((entry) => {
				entry.messaging.forEach((event) => {
					let sender = event.sender.id;
					if (event.message && event.message.text) {
						let text = event.message.text;
						self.sendMessage(req, event, sender, text);
					} else if (event.postback && event.postback.payload) {
						var eventInfo;
						console.log(event.postback.payload);
						switch (event.postback.payload) {
							case "CREATE_INCIDENT":
								eventInfo = {
									name: "create_incident_event"
								};
								self.invokeEvent(sender, eventInfo);
								break;
							case "GET_INCIDENT_STATUS":
								eventInfo = {
									name: "get_incidentinfo_event"
								};
								self.invokeEvent(sender, eventInfo);
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
	sendMessage: function (req, event, sender, text) {

		let apiai = apiaiApp.textRequest(text, {
			sessionId: '1234567890'
		});

		self.createChatLog(CircularJSON.stringify(event));

		apiai.on('response', (response) => {
			let aiText = response.result.fulfillment.speech;
			
			if (response.result.action === "input.welcome") {
				self.dislplayWelcomeCard(event);
			} else {
				
				let messageData = { text: aiText };
				if (response.result.actionIncomplete === true) {
					switch (aiText) {
						case "Please choose a category":
							messageData = self.showCategoryChoices(aiText);
							break;
						case "Please select the impact level":
							messageData = self.showImpactLevels(aiText);
							break;
					}
				}
				request({
					url: 'https://graph.facebook.com/v2.6/me/messages',
					qs: { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
					method: 'POST',
					json: {
						recipient: { id: sender },
						message: messageData
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
	invokeEvent: function (sender, eventInfo) {
		var options = {
			sessionId: '1234567890'
		};

		var apiai = apiaiApp.eventRequest(eventInfo, options);
		apiai.on('response', function (response) {
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
	showCategoryChoices: function (aiText) {
		let messageData = {
			"text": aiText,
			"quick_replies": [
				{
					"content_type": "text",
					"title": "inquiry/Help",
					"payload": "inquiry"
				},
				{
					"content_type": "text",
					"title": "Software",
					"payload": "software"
				},
				{
					"content_type": "text",
					"title": "Hardware",
					"payload": "hardware"
				},
				{
					"content_type": "text",
					"title": "Network",
					"payload": "network"
				},
				{
					"content_type": "text",
					"title": "Database",
					"payload": "database",
				}
			]
		};
		return messageData;
	},
	showImpactLevels: function (aiText) {
		let messageData = {
			"text": aiText,
			"quick_replies": [
				{
					"content_type": "text",
					"title": "High",
					"payload": "1"
				},
				{
					"content_type": "text",
					"title": "Medium",
					"payload": "2"
				},
				{
					"content_type": "text",
					"title": "Low",
					"payload": "3"
				}
			]
		};
		return messageData;
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
		let incidentNumber = req.body.result.parameters.sysid.toUpperCase();
		let dataToSend = "Incident status is ";
		var options = {
			method: 'GET',
			url: 'https://dev18442.service-now.com/api/now/v1/table/incident',
			qs: {
				number: incidentNumber
			},
			headers: {
				'postman-token': '5441f224-d11a-2f78-69cd-51e58e2fbdb6',
				'cache-control': 'no-cache',
				authorization: 'Basic MzMyMzg6YWJjMTIz'
			}, json: true
		};
		request(options, function (error, response, body) {
			if (error) {
				response = (typeof (error) == 'object') ? JSON.stringify(error) : error;
				return res.json({
					speech: response,
					displayText: error,
					source: '/incident/getstatus'
				});
			} else {
				if (body.error) {
					dataToSend = "Sorry!.Data is not available";
				} else {
					switch (body.result[0].incident_state) {
						case '1': case 1: dataToSend += "new"; break;
						case '2': case 2: dataToSend += "in-prog"; break;
						case '3': case 3: dataToSend += "on-hold"; break;
						case '6': case 6: dataToSend += "resolved"; break;
						case '7': case 7: dataToSend += "closed"; break;
						case '8': case 8: dataToSend += "canceled"; break;
					}
				}
				return res.json({
					speech: dataToSend,
					displayText: dataToSend,
					source: '/incident/getstatus'
				});
			}
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
	},
	createChatLog: function (logTxt) {
		var now = new Date();
		var day = dateFormat(now, "dd-mmm-yyyy");
		var filename = "public/logs/" + day + ".txt";
		fs.open(filename, 'r', function (err, fd) {
			if (err) {
				fs.writeFile(filename, logTxt, function (err) {
					if (err) {
						console.log(err);
					}
					console.log("The file was saved!");
				});
			} else {
				fs.appendFile(filename, logTxt, function (err) {
					if (err) throw err;
					console.log('Saved!');
				});
			}
		});
	}
}

module.exports = self;
