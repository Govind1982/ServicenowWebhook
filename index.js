'use strict';

require('dotenv').config();
var express = require('express');
var app = express();
var routes = require('./routes');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', routes);

app.listen((process.env.PORT), function () {
    console.log("Server is up and running in " + process.env.HOSTNAME + ":" + process.env.PORT);
});