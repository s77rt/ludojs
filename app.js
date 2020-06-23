// app.js
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
app.use('/static', express.static(path.join(__dirname, 'public')));

// Start the Express server
server.listen(4004, () => console.log('Server running on port 4004'));

// Game Server (Sockets)
require('./game.server.js')(io);
