const routes = require('express').Router();
var controllers = require('../controllers/api');

routes.post('/webhook', controllers.webhookEndpoint);
routes.get('/webhook', controllers.webhookVerification);
routes.post('/webhook/processIncident', controllers.processIncident);
routes.get('/test',controllers.createChatLog);

module.exports = routes;
