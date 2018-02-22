const routes = require('express').Router();
var controllers = require('../controllers/api');

routes.get('/', controllers.renderHome);
routes.post('/webhook/processIncident', controllers.processIncident);

module.exports = routes;
