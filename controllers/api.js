'use strict';

require('../libraries/FacebookBot');
var apiai = require('apiai');
const request = require('request');
const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord(process.env.SERVICENOW_INSTANCE, process.env.SERVICENOW_TABLE, process.env.SERVICENOW_USERNAME, process.env.SERVICENOW_PASSWORD, process.env.SERVICENOW_API_VERSION);
let facebookBot = new FacebookBot();

var self = {
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
		let VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

		if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
			res.send(req.query['hub.challenge']);
		} else {
			res.send('Error, wrong validation token');
		}
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
