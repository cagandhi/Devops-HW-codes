
const routes = require('express').Router();

// Add your route here...
routes.get('/dayofweek', (req, res) => {
    let dow = new Date().getDay();
    res.send(dow.toString());
});

module.exports = routes;
