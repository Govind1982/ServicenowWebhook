const routes = require('express').Router();
var controllers = require('../controllers/api');

routes.post('/webhook/processIncident', controllers.createIncident);

module.exports = routes;
