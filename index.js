'use strict';

const app = require('express')();
const routes = require('./routes');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use('/', routes);

app.listen((process.env.PORT || 8000), function () {
    console.log("Server is up and running...");
});