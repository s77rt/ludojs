/*
	Modules that we need
*/

var seedrandom = require('seedrandom');
var SpawnBot = require('./game.server.bot.js');
var filterXSS = require("xss");

/*
	Initialize
*/

var _Servers = new Servers();
var _Players = new Players();

const SAFE_PATH = [0, 1, 14, 27, 40, 53, 54, 55, 56, 57, 58, 59];

/*
	Logic
*/

// Servers
function Server(id, isPrivate) {
	this.id = id;
	this._isPrivate = isPrivate;
	this.token = this.randomToken();
	this._token_validate = seedrandom(this.token);
	this._dice_value = null;
	this._expected_action = "roll";
	this.players = 1;
	this.max_players = 4;
	this.playing = false;
	this.player_turn = null;
	this.players_data = {
		1: {
			 id: null,
			 name: "Ghost",
			 percentage: 0,
			 pieces: {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
			 }
		},
		2: {
			 id: null,
			 name: "Ghost",
			 percentage: 0,
			 pieces: {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
			 }
		},
		3: {
			 id: null,
			 name: "Ghost",
			 percentage: 0,
			 pieces: {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
			 }
		},
		4: {
			 id: null,
			 name: "Ghost",
			 percentage: 0,
			 pieces: {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
			 }
		},
	};
}
Server.prototype.randomToken = function(length) {
	length = length || 6;
	var result           = '';
	var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}
Server.prototype.GetSeqIdForNewPlayerInServer = function(preferred_seq_id) {
	var seq_id = null;
	if (this.players === 1) {
		for (let [key, value] of Object.entries(this.players_data)) {
			if (value.id != null) {
				k = parseInt(key);
				seq_id = k > 2 ? k-2 : k+2;
				break;
			}
		}
	} else {
		preferred_seq_id = parseInt(preferred_seq_id || 0);
		if (preferred_seq_id > 0 && preferred_seq_id < 5 && this.players_data[preferred_seq_id].id === null) {
			seq_id = preferred_seq_id;
		} else {
			for (let [key, value] of Object.entries(this.players_data)) {
				if (value.id === null) {
					seq_id = parseInt(key);
					break;
				}
			}
		}
	}
	return seq_id;
}
Server.prototype.StartGame = function() {
	this.player_turn = Math.floor(Math.random() * 4) + 1;
	this.NextPlayerTurn(); // because the selected player may not be available, so move to the next one
	this.playing = true;
}
Server.prototype.NextPlayerTurn = function() {
	let players_that_are_still_playing = 0;
	let next_player = null;
	let next_player_id = null;
	var tmp_next_player = this.player_turn;
	var checks = 0;
	while(checks < 4) {
		tmp_next_player = tmp_next_player === 4 ? 1 : tmp_next_player+1;
		if (this.players_data[tmp_next_player].id && this.players_data[tmp_next_player].percentage != 100) {
			if (!next_player) {
				next_player = tmp_next_player;
				next_player_id = this.players_data[next_player].id;
			}
			players_that_are_still_playing++;
		}
		checks++;
	}
	if (next_player_id && players_that_are_still_playing > 1) {
		this.token = this.randomToken();
		this._token_validate = seedrandom(this.token);
		this._expected_action = "roll";
		this.player_turn = next_player;
		_Players.PlayersList[next_player_id].setTimer();
	} else if (this.playing === true) {
		this.player_turn = -1;
	} else {
		this.player_turn = null;
	}
}
Server.prototype.updatePlayerPercentage = function(player) {
	var totalPos = 0;
	Object.values(this.players_data[player].pieces).forEach(function(piece) {
		totalPos += piece;
	});
	this.players_data[player].percentage = Math.floor(100*((totalPos / 4) / 59));
}

function Servers() {
	this.ServersList = {};
}
Servers.prototype.AddServer = function(id, isPrivate) {
	this.ServersList[id] = new Server(id, isPrivate);
	return this.ServersList[id];
}
Servers.prototype.DeleteServer = function(id) {
	delete this.ServersList[id];
}
Servers.prototype.GetAutoServer = function() {
	var server_id = null;
	for (let [key, value] of Object.entries(this.ServersList)) {
		if (value.players < value.max_players && !value.playing && !value._isPrivate) {
			server_id = key;
			break;
		}
	}
	return server_id;
}

// Players
function Player(socket) {
	this.socket = socket;
	this.server = null;
	this.seq_id = null;
	this.Timer = null;
}
Player.prototype.setTimer = function() {
	this.Timer = setTimeout(() => {
		if (this.server) {
			this.LeaveServer();
			this.socket.emit('ServerError', 'You have been kicked out due to inactivity');
		}
	}, 30*1000);
}
Player.prototype.clearTimer = function() {
	clearTimeout(this.Timer);
}
Player.prototype.resetTimer = function() {
	this.clearTimer();
	this.setTimer();
}
Player.prototype.AutoServer = function(playername, preferred_seq_id) {
	let server_id = _Servers.GetAutoServer();
	if (server_id === null) {
		this.HostServer(false, playername, preferred_seq_id);
	} else {
		this.JoinServer(server_id, playername, preferred_seq_id);
	}
}
Player.prototype.JoinServer = function(server_id, playername, preferred_seq_id, or_host) {
	this.LeaveServer();
	server_id = parseInt(server_id);
	let server = _Servers.ServersList[server_id];
	if (!server) {
		if (or_host === true) {
			this.HostServer(true, playername, preferred_seq_id, server_id);
		} else {
			this.socket.emit('ServerError', 'Table #'+server_id+' does not exist');
		}
		return;
	}
	let seq_id = server.GetSeqIdForNewPlayerInServer(preferred_seq_id);

	if (seq_id && server.players < server.max_players && !server.playing) {
		this.socket.join(server_id);
		this.server = server;
		this.seq_id = seq_id;
		this.server.players_data[seq_id].name = (playername || '').replace(/[^\w]/gi, '').trim().substring(0, 15) || "Ghost";

		server.players++;
		server.players_data[this.seq_id].id = this.socket.id;

		this.socket.emit('JoinServer', {seq_id: this.seq_id, isPrivate: server._isPrivate});
		if (server.players === server.max_players)
			server.StartGame();
		this.socket.emit('ServerUpdate', server_id, server);
		this.socket.to(server_id).emit('ServerUpdate', server_id, server);
	} else {
		this.socket.emit('ServerError', 'Table #'+server_id+' is not available');
	}
}
Player.prototype.HostServer = function(isPrivate, playername, preferred_seq_id, server_id) {
	this.LeaveServer();
	isPrivate = (isPrivate === true) ? true : false;
	server_id = parseInt(server_id);
	if (!(server_id < Number.MAX_SAFE_INTEGER && server_id > 999999)) // 6 digits servers id are reserved for HostServer() that does not specify a server_id
		server_id = random_number();
	while(_Servers.ServersList.hasOwnProperty(server_id)) {
		server_id = random_number();
	}
	let server = _Servers.AddServer(server_id, isPrivate);

	this.socket.join(server_id);
	this.server = server;
	preferred_seq_id = parseInt(preferred_seq_id || 0);
	this.seq_id = (preferred_seq_id > 0 && preferred_seq_id < 5) ? preferred_seq_id : Math.floor(Math.random() * 4) + 1;
	this.server.players_data[this.seq_id].name = (playername || '').replace(/[^\w]/gi, '').trim().substring(0, 15) || "Ghost";

	server.players_data[this.seq_id].id = this.socket.id;

	if (!isPrivate)
		SpawnBot(server_id);

	this.socket.emit('HostServer', {seq_id: this.seq_id, isPrivate: isPrivate, server_id: server_id});
	this.socket.emit('ServerUpdate', server_id, server);
}
Player.prototype.LeaveServer = function() {
	if (!this.server)
		return;

	let server_id = this.server.id;

	let server = this.server;

	server.players_data[this.seq_id].id = null;
	server.players--;

	this.server = null;
	this.clearTimer();

	if (server.players === 0) {
		this.socket.leave(server_id);
		_Servers.DeleteServer(server_id);
	} else {
		if (server.player_turn === this.seq_id) {
			server.NextPlayerTurn();
		}
		this.socket.to(server_id).emit('ServerUpdate', server_id, server);
		this.socket.leave(server_id);
	}

	this.seq_id = null;

	this.socket.emit('LeaveServer', true);
}
Player.prototype.StartGame = function() {
	if (!this.server)
		return;

	if (this.server.playing) {
		this.socket.emit('ServerUpdate', this.server.id, this.server);
	} else if (this.server.players === 1) {
		this.socket.emit('GameError', "At least two players are required to start the game");
	} else {
		this.server.StartGame();
		this.socket.emit('ServerUpdate', this.server.id, this.server);
		this.socket.to(this.server.id).emit('ServerUpdate', this.server.id, this.server);
	}
}
Player.prototype.UpdateGame = function(action) {
	if (!this.server)
		return;
	if (!this.server.playing)
		return;

	if (this.server.player_turn === this.seq_id && this.server.players_data[this.seq_id].id === this.socket.id && this.server._expected_action === action.action) {
		let data = action.data;
		switch(action.action) {
			case "roll":
				// check if legit
				if (data.number != (Math.floor(this.server._token_validate() * 6) + 1))
					return;

				this.server._dice_value = data.number;
				this.socket.to(this.server.id).emit('GameUpdate', this.server.id, action);
				var CanPlay = Object.values(this.server.players_data[this.seq_id].pieces).some((piece) => 
					((piece === 0 && data.number === 6) || (piece >= 1 && piece + data.number <= 59))
				);
				if (CanPlay) {
					this.resetTimer();
					this.server._expected_action = "move";
				} else if (data.number === 6) {
					this.resetTimer();
					this.server._expected_action = "roll";
				} else {
					this.clearTimer();
					this.server._expected_action = "roll";
					this.server.NextPlayerTurn();
					this.socket.emit('ServerUpdate', this.server.id, this.server);
					this.socket.to(this.server.id).emit('ServerUpdate', this.server.id, this.server);
				}
				break;
			case "move":
				// check if legit
				if (data.player != this.seq_id)
					return;
				if (data.old_pos != this.server.players_data[data.player].pieces[data.piece])
					return;
				if (data.old_pos === 0) {
					if (data.new_pos != 1 || this.server._dice_value != 6)
						return
				} else if (data.new_pos <= 59){
					if (data.new_pos - data.old_pos != this.server._dice_value)
						return;
				} else {
					return;
				}

				this.server.players_data[data.player].pieces[data.piece] = data.new_pos;
				this.server.updatePlayerPercentage(data.player);

				let c_enemies = 0;
				for (let [player_seq_id, player] of Object.entries(this.server.players_data)) {
					if (parseInt(player_seq_id) != this.seq_id) {
						// check for c_enemies
						for (let [piece_seq_id, piece] of Object.entries(player.pieces)) {
							if (!SAFE_PATH.includes(piece)) {
								let offset = parseInt(player_seq_id) - this.seq_id;
								if (offset > 0) {
									if (piece <= (4-offset)*13)
										offset = -offset*13;
									else
										offset = (4-offset)*13;
								} else {
									if (piece <= -offset*13)
										offset = -(4+offset)*13;
									else
										offset = -offset*13;
								}
								if (piece - offset === data.new_pos) {
									this.server.players_data[player_seq_id].pieces[piece_seq_id] = 0;
									this.server.updatePlayerPercentage(player_seq_id);
									c_enemies++;
								}
							}
						}
					}
				}

				this.socket.to(this.server.id).emit('GameUpdate', this.server.id, action);
				this.server._expected_action = "roll";
				if ((this.server._dice_value != 6 && c_enemies === 0) || this.server.players_data[this.seq_id].percentage === 100) {
					this.clearTimer();
					this.server.NextPlayerTurn();
					this.socket.emit('ServerUpdate', this.server.id, this.server);
					this.socket.to(this.server.id).emit('ServerUpdate', this.server.id, this.server);
				} else {
					this.resetTimer();
				}
				break;
		}
	}
}
Player.prototype.Message = function(msg) {
	if (!this.server)
		return;
	if (!this.server._isPrivate)
		return;
	msg = filterXSS(msg || '').trim().substring(0, 128);
	if (msg.length) {
		this.socket.to(this.server.id).emit('Message', {msg: msg, source: this.seq_id});
	}
}

function Players() {
	this.PlayersList = {};
}
Players.prototype.AddPlayer = function(socket) {
	this.PlayersList[socket.id] = new Player(socket);
	return this.PlayersList[socket.id];
}
Players.prototype.DeletePlayer = function(id) {
	this.PlayersList[id].LeaveServer();
	delete this.PlayersList[id];
}

/*
	Helpers
*/

function random_number() {
	return 100000 + Math.floor(Math.random() * 900000);
}

/*
	Show Time :)
*/

exports = module.exports = function(io) {
	console.log("Game server started");
	io.on('connection', function (socket) {
		let player = _Players.AddPlayer(socket);

		socket.on('disconnect', function () {
			_Players.DeletePlayer(socket.id);
		});

		socket.on('OnlinePlayers', function () {
			socket.emit('OnlinePlayers', Object.keys(_Players.PlayersList).length);
		});

		socket.on('AutoServer', player.AutoServer.bind(player));
		socket.on('HostServer', player.HostServer.bind(player));
		socket.on('JoinServer', player.JoinServer.bind(player));
		socket.on('LeaveServer', player.LeaveServer.bind(player));
		socket.on('StartGame', player.StartGame.bind(player));
		socket.on('UpdateGame', player.UpdateGame.bind(player));
		socket.on('Message', player.Message.bind(player));
	});
};
