// app.js
const config = require('./config.js');
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);

// Basic Routing
app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/index.html'));
});

// Static Routing
/*app.use('/static', express.static(path.join(__dirname, 'public')));*/
// serve static files using nginx


// Others
/*app.get('/service-worker.js', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/browser/service-worker.js'));
});
app.get('/sitemap.xml', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/seo/sitemap.xml'));
});
app.get('/robots.txt', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/seo/robots.txt'));
});*/
// serve static files using nginx


// Start the Express server
server.listen(config.Port, () => console.log('Server running on port '+config.Port));

// Game Server (Sockets)
require('./game.server.js')(io);
