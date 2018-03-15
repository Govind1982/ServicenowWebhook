'use strict';

require('dotenv').config();
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');

app.use(cookieParser()); // read cookies (needed for auth)
app.use(morgan('dev')); // log every request to the console
app.use("/public", express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// required for passport
app.use(session({
    secret: 'ilovescotchscotchyscotchscotch', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
require('./routes')(express, passport);

app.listen((process.env.PORT), function () {
    console.log("Server is up and running in " + process.env.HOSTNAME + ":" + process.env.PORT);
});