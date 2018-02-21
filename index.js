'use strict';

require('dotenv').config();
const app = require('express')();
const routes = require('./routes');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use('/', routes);

app.listen((process.env.PORT), function () {
    console.log("Server is up and running in "+process.env.HOSTNAME+":"+process.env.PORT);
});