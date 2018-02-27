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
			console.log(response)
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
		});

		apiai.on('error', (error) => {
			console.log(error);
		});

		apiai.end();
	},
	processIncident: function (req, res) {
		switch (req.body.result.action) {
			case "getIncidentStatus":
				self.getIncidentStatus(req, res);
				break;
			case "createIncident":
				self.createIncident(req, res);
				break;
			case "input.welcome":
				self.dislplayWelcomeCard(req, res);
				break;
		}
	},
	dislplayWelcomeCard: function (req, res) {
		 res.json({
			"speech": "",
			"messages": [{
				  "type": 1,
				  "platform": "facebook",
				  'title': 'Please choose an item',
				  "subtitle": "Thank you for using me, I can help you please choose any one option",
				  'imageUrl': 'https://diginomica.com/wp-content/uploads/2015/01/servicenow.jpeg',
				  "buttons": [
					{
					  "text": "Create Incident",
					  "postback": "Create Incident"
					},
					{
					  "text": "Track Incident",
					  "postback": ""
					}
				  ]
				},				 
				{
					"type": 0,
					"speech": ""
				}]
		});
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