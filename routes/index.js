var controllers = require('../controllers/api');

module.exports = function (express, passport) {
    const routes = express.Router();
    routes.post('/webhook', controllers.webhookEndpoint);
    routes.get('/webhook', controllers.webhookVerification);
    routes.post('/webhook/processIncident', controllers.processIncident);
    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });
}
