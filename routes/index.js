const routes = require('express').Router();
var controllers = require('../controllers/api');

routes.post('/incident/create', controllers.createIncident);
routes.post('/incident/getstatus', controllers.getIncidentStatus);

module.exports = routes;
