const routes = require('express').Router();
var controllers = require('../controllers/api');

routes.post('/incident/create', controllers.createIncident);
routes.get('/incident/getstatus', controllers.getIncidentStatus);

module.exports = routes;
