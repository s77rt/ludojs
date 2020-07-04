// Colors
const RED = 0xf44336;
const RED_2 = 0xef5350;

const GREEN = 0x4caf50;
const GREEN_2 = 0x66bb6a;

const YELLOW = 0xffeb3b;
const YELLOW_2 = 0xffee58;

const BLUE = 0x2196f3;
const BLUE_2 = 0x42a5f5;

const BORDER = 0x000000;
const BOARD = 0xddffff;
const BACKGROUND = 0xede574;
const TEXT = 0x111111;

const COLOR_MAP = {
	0: 0xffffff,
	1: RED,
	2: GREEN,
	3: YELLOW,
	4: BLUE,
}

const SAFE_PATH = [0, 1, 14, 27, 40, 53, 54, 55, 56, 57, 58, 59];

Storage.prototype.setObject = function(key, value) {
	this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
	var value = this.getItem(key);
	return value && JSON.parse(value);
}

class Game {
	constructor() {
		this.playername = (localStorage.getItem('playername') || '').replace(/[^\w]/gi, '').trim().substring(0, 15) || 'Player'+random_number();
		this.my_seq_id = 1; // 1 is for just for fallback
		this.player_turn = null;
		this.busy = false; // for smooth updaes
		this.funqueue = []; // functions queue

		this.brand = document.getElementById('brand');
		this.spinner = new Game_Spinner();

		this.token = Math.random;

		this._socket = io();
		this._socket.on('OnlinePlayers', this.onOnlinePlayers.bind(this));

		this._socket.on('JoinServer', this.onJoinServer.bind(this));
		this._socket.on('HostServer', this.onHostServer.bind(this));
		this._socket.on('LeaveServer', this.onLeaveServer.bind(this));

		this._socket.on('ServerUpdate', function(data) {
			this.funqueue.push(function() {this.onServerUpdate(data)}.bind(this));
			this.process_funqueue();
		}.bind(this));
		this._socket.on('ServerError', this.onServerError.bind(this));

		this._socket.on('GameUpdate', function(data) {
			this.funqueue.push(function() {this.onGameUpdate(data)}.bind(this));
			this.process_funqueue();
		}.bind(this));
		this._socket.on('GameError', this.onGameError.bind(this));

		this._socket.on('Message', this.onMessage.bind(this));
	}

	setReady() {
		this.busy = false;
		this.process_funqueue();
	}
	setBusy() {
		this.busy = true;
	}

	process_funqueue() {
		if (!this.busy && this.funqueue.length > 0) {
			this.setBusy(); // just to be safe
			(this.funqueue.shift())();
		}
	}

	OnlinePlayers() {
		this._socket.emit('OnlinePlayers');
	}

	LocalServer(playing_again) {
		this._localPaused = 0;
		this._localBots = [];
		let c = async function(playing_again) {
			if (playing_again === true) {
				var Players = this._localPlayers;
			} else {
				var { value: Players } = await Swal.fire({
				  title: 'Players',
				  confirmButtonText: 'Play',
				  html:
					'Click to Switch Player Status<br><br>'+
					'<div class="d-flex">'+
					'<div class="playerconfig"><button id="swal-player1" data-player="1" data-status="{none}" class="playerconfig-content" style="opacity: 0.5;background-color: #'+COLOR_MAP[1].toString(16).padStart(6, '0')+'">Not Playing</button></div>'+
					'<div class="playerconfig"><button id="swal-player2" data-player="2" data-status="{none}" class="playerconfig-content" style="opacity: 0.5;background-color: #'+COLOR_MAP[2].toString(16).padStart(6, '0')+'">Not Playing</button></div>'+
					'<div class="playerconfig"><button id="swal-player4" data-player="4" data-status="{none}" class="playerconfig-content" style="opacity: 0.5;background-color: #'+COLOR_MAP[4].toString(16).padStart(6, '0')+'">Not Playing</button></div>'+
					'<div class="playerconfig"><button id="swal-player3" data-player="3" data-status="{none}" class="playerconfig-content" style="opacity: 0.5;background-color: #'+COLOR_MAP[3].toString(16).padStart(6, '0')+'">Not Playing</button></div>'+
					'</div>'+
					'<br>Players Names<br>'+
					'<input value="Not Playing" disabled="disabled" id="swal-player1-settings" data-player="1" class="swal2-input player" style="text-align:center;margin:.5em auto;border-color: #'+COLOR_MAP[1].toString(16).padStart(6, '0')+'" type="text" maxlength="15" placeholder="Enter Player 1 Name...">'+
					'<input value="Not Playing" disabled="disabled" id="swal-player2-settings" data-player="2" class="swal2-input player" style="text-align:center;margin:.5em auto;border-color: #'+COLOR_MAP[2].toString(16).padStart(6, '0')+'" type="text" maxlength="15" placeholder="Enter Player 2 Name...">'+
					'<input value="Not Playing" disabled="disabled" id="swal-player4-settings" data-player="4" class="swal2-input player" style="text-align:center;margin:.5em auto;border-color: #'+COLOR_MAP[4].toString(16).padStart(6, '0')+'" type="text" maxlength="15" placeholder="Enter Player 4 Name...">'+
					'<input value="Not Playing" disabled="disabled" id="swal-player3-settings" data-player="3" class="swal2-input player" style="text-align:center;margin:.5em auto;border-color: #'+COLOR_MAP[3].toString(16).padStart(6, '0')+'" type="text" maxlength="15" placeholder="Enter Player 3 Name...">',
				  focusConfirm: false,
				  onBeforeOpen: () => {
					const content = Swal.getContent();
					if (content) {
						const buttons = content.querySelectorAll('button');
						buttons.forEach(function(button) {
							button.addEventListener("click", function(){
								let player_seq_id = button.dataset.player;
								let player_data = localStorage.getObject('player'+player_seq_id);
								let tmp_player_data_name;
								let player_data_name;
								if (player_data) {
									tmp_player_data_name = (player_data.name || '').replace(/[^\w]/gi, '').trim().substring(0, 15);
								} else {
									tmp_player_data_name = 'Player'+player_seq_id;
								}
								player_data_name = tmp_player_data_name || 'Player'+player_seq_id;
								const player = content.querySelector('input[data-player="'+player_seq_id+'"]');
								switch(button.dataset.status) {
									case "{none}":
										localStorage.setObject('player'+player_seq_id, {name: player_data_name, isbot: false});
										button.dataset.status = "{player}";
										button.innerText = tmp_player_data_name;
										button.style.opacity = 1;
										player.disabled = false;
										player.value = tmp_player_data_name;
										break;
									case "{player}":
										localStorage.setObject('player'+player_seq_id, {name: player_data_name, isbot: true});
										button.dataset.status = "{bot}";
										button.innerText = "[ BOT ]";
										button.style.opacity = 1;
										player.disabled = true;
										player.value = "[ BOT ]";
										break;
									case "{bot}":
										localStorage.setObject('player'+player_seq_id, {name: player_data_name, isbot: false});
										button.dataset.status = "{none}";
										button.innerText = "Not Playing";
										button.style.opacity = 0.5;
										player.disabled = true;
										player.value = "Not Playing";
										break;
								}
							});
						});

						const players = content.querySelectorAll('.player');
						players.forEach(function(player) {
							let player_seq_id = player.dataset.player;
							let player_data_name;
							player.addEventListener("input", function() {
								player_data_name = player.value.replace(/[^\w]/gi, '').trim().substring(0, 15) || 'Player'+player_seq_id;
								player.value = tmp_player_data_name;
								const button = content.querySelector('button[data-player="'+player_seq_id+'"]');
								button.innerText = tmp_player_data_name;
								localStorage.setObject('player'+player_seq_id, {name: player_data_name, isbot: false});
							});
						});
					}
				  },
				  preConfirm: () => {
					let available_players = [];
					let player1_status = document.getElementById('swal-player1').dataset.status;
					let player2_status = document.getElementById('swal-player2').dataset.status;
					let player3_status = document.getElementById('swal-player3').dataset.status;
					let player4_status = document.getElementById('swal-player4').dataset.status;
					let players_status = [player1_status, player2_status, player3_status, player4_status];
					players_status.forEach(function(player_status, index){
						if (player_status != "{none}")
							available_players.push(index+1);
					});
					if (available_players.length > 1) {
						return available_players;
					} else {
						Swal.fire(
						  'Oops!',
						  'At least two players are required to play the game',
						  'error'
						);
						this.loadMainMenu();
					}
				  }
				});
			}

			if (Players) {
				this.spinner.show();
				this.player_turn = null;
				this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
				this._localPlayers = Players; // Save in case of playing_again
				this.onLocalServer();
				Players.forEach(function(player_seq_id) {
					let player_data = localStorage.getObject('player'+player_seq_id);
					let player_data_isbot, player_data_name;
					if (player_data) {
						player_data_isbot = player_data.isbot;
						if (player_data_isbot === true) {
							player_data_name = 'BOT_'+player_seq_id;
							this._localBots.push(player_seq_id);
						} else {
							player_data_name = (player_data.name || '').replace(/[^\w]/gi, '').trim().substring(0, 15) || 'Player'+player_seq_id;
						}
					} else {
						player_data_isbot = false;
						player_data_name = 'Player'+player_seq_id;
					}
					this.Players[player_seq_id].updateInfo(player_data_name, 0);
				}, this);
			} else {
				this.loadMainMenu();
			}
		}.bind(this)(playing_again);
	}
	NextPlayerTurn() {
		if (!this._isLocal)
			return;
		let players_that_are_still_playing = 0;
		let next_player = null;
		var tmp_next_player = this.player_turn;
		var checks = 0;
		while(checks < 4) {
			tmp_next_player = tmp_next_player === 4 ? 1 : tmp_next_player+1;
			if (this.Players[tmp_next_player].name.length && this.Players[tmp_next_player].percentage != 100) {
				if (!next_player) {
					next_player = tmp_next_player;
				}
				players_that_are_still_playing++;
			}
			checks++;
		}
		if (next_player && players_that_are_still_playing > 1) {
			this.player_turn = next_player;
			this.my_seq_id = this.player_turn;
		} else {
			this.player_turn = -1;
		}
	}

	AutoServer() {
		this.spinner.show();
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		this._socket.emit('AutoServer', this.playername);
	}
	JoinServer(id, or_host) {
		this.spinner.show();
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		this._socket.emit('JoinServer', id, this.playername, or_host);
	}
	HostServer(isPrivate) {
		this.spinner.show();
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		isPrivate = (isPrivate === true) ? true : false;
		this._socket.emit('HostServer', isPrivate, this.playername);
	}
	LeaveServer() {
		this.my_seq_id = 1;
		this.player_turn = null;
		this.funqueue = [];
		this.busy = false;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		this._socket.emit('LeaveServer');
	}

	StartGame() {
		this.spinner.show();
		if (this._isLocal) {
			this.player_turn = Math.floor(Math.random() * 4) + 1;
			this.NextPlayerTurn();
			this.onServerUpdate({players_data: {}, playing: true, player_turn: this.player_turn});
		} else {
			this._socket.emit('StartGame');
		}
	}
	UpdateGame(action) {
		if (!this._isLocal)
			this._socket.emit('UpdateGame', action);
	}
	PauseGame() {
		if (!this._isLocal)
			return;
		this._localPaused = 1;
		this._chat.addMessage("Game will be paused in the next turn", 0);
		Swal.fire({
			text: "The game will be paused after the current player's turn",
			position: 'top-end',
			toast: true,
			showConfirmButton: false
		})
	}
	ResumeGame() {
		if (!this._isLocal)
			return;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['pause'];
		this._localPaused = 0;
		this._chat.addMessage("Game Resumed", 0);
		this.onServerUpdate(this._localLastServerUpdate);
	}

	Message(msg) {
		this._socket.emit('Message', msg);
	}

	onOnlinePlayers(n) {
		this._onlineplayers.text = 'Online Players: '+n;
	}

	onLocalServer() {
		this.spinner.hide();
		this.loadBoard(true, true);
		this._chat.addMessage("This is an offline server", 0);
	}

	onJoinServer(data) {
		this.spinner.hide();
		this.my_seq_id = data.seq_id;
		this.loadBoard(data.isPrivate, false);
		this._chat.addMessage("You are a guest", 0);
	}
	onHostServer(data) {
		this.spinner.hide();
		this.my_seq_id = data.seq_id;
		this.loadBoard(data.isPrivate, false);
		this._chat.addMessage("You are the host", 0);
		if (data.isPrivate === true) {
			const server_id = data.server_id;
			Swal.fire({
			  title: `${server_id}`,
			  text: `Awesome! your table id is: ${server_id}`,
			  icon: 'success',
			  confirmButtonText: 'Copy'
			}).then((result) => {
				if (result.value) {
					copyTextToClipboard(server_id);
				}
			});
			this._chat.addMessage("Invite friends by table id "+server_id, 0);
		}
	}
	onLeaveServer(bool) {
		this.my_seq_id = 1;
		this.player_turn = null;
		this.funqueue = [];
		this.busy = false;
	}

	onServerUpdate(data) {
		this.spinner.hide();
		this.token = new Math.seedrandom(data.token);
		for (let [seq_id, player_data] of Object.entries(data.players_data)) {
			let player = this.Players[seq_id];
			if (player_data.id === null) {
				player.clearInfo();
				continue;
			}
			player.updateInfo(player_data.name, player_data.percentage);
		}
		if (data.playing) {
			this.player_turn = data.player_turn;
			let dice = this._board._Dice;
			if (dice.tint === 0xffffff) {
				this._chat.addMessage("Game Started", 0);
				this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['pause'];
				PIXI.Loader.shared.resources.game_started.sound.play();
			}
			if (this.player_turn === -1) {
				setTimeout(() => {
					if (dice.tint === 0x000000)
						return;
					this._chat.addMessage("Game Over", 0);
					PIXI.Loader.shared.resources.game_over.sound.play();
					dice.changeColor(0x000000);
					if (!this._isPrivate) {
						Swal.fire({
						  title: 'Another match?',
						  icon: 'question',
						  allowOutsideClick: false,
						  allowEscapeKey: false,
						  showCancelButton: true,
						  confirmButtonText: 'Yes, Please',
						  cancelButtonText: 'No, Thanks',
						}).then((result) => {
							if (result.value) {
								this.AutoServer();
							} else {
								this.LeaveServer();
								this.loadMainMenu();
							}
						});
					} else if (this._isLocal) {
						Swal.fire({
						  title: 'Play again?',
						  icon: 'question',
						  allowOutsideClick: false,
						  allowEscapeKey: false,
						  showCancelButton: true,
						  confirmButtonText: 'Yes, Please',
						  cancelButtonText: 'No, Thanks',
						}).then((result) => {
							if (result.value) {
								this.LocalServer(true);
							} else {
								this.loadMainMenu();
							}
						});
					} else {
						Swal.fire({
						  title: 'Match again?',
						  icon: 'question',
						  allowOutsideClick: false,
						  allowEscapeKey: false,
						  showCancelButton: true,
						  confirmButtonText: 'Yes, Please',
						  cancelButtonText: 'No, Thanks',
						}).then((result) => {
							if (result.value) {
								this.JoinServer((data.id > 999999) ? data.id+1 : data.id*10, true);
							} else {
								this.LeaveServer();
								this.loadMainMenu();
							}
						});
					}
				}, (0.07*6*1000 * 2)); // just to be sure that the last steps are made
			} else if (this.player_turn > 0 && this.player_turn < 5) {
				if (this._isLocal && this._localPaused === 1) {
					this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
					this._localPaused = 2;
					this._chat.addMessage("Game Paused", 0);
					Swal.fire({
						icon: "info",
						text: "Game Paused",
						confirmButtonText: "Resume ▶"
					}).then((result) => {
						if (result.value) {
							this.ResumeGame();
						}
					});
					this._localLastServerUpdate = data; // save this data to be used on game resume
					return;
				}
				dice.changeColor(COLOR_MAP[this.player_turn]);
				this.Players[this.player_turn].BringMyPiecesUpFront();
				if (this.player_turn === this.my_seq_id) {
					dice.setInteractive(true);
					let x_overflow_left = dice.x - dice.width/2 < 0;
					let x_overflow_right = dice.x + dice.width/2 > 15*dice._board._BoxSize;
					let x_overflow = x_overflow_left || x_overflow_right;

					let y_overflow_up = dice.y - dice.height/2 < 0;
					let y_overflow_down = dice.y + dice.height/2 > 15*dice._board._BoxSize;
					let y_overflow = y_overflow_up || y_overflow_down;

					if (x_overflow)
						dice.x = (dice._board.width / 2) - dice._board._BoxSize/2;
					if (y_overflow)
						dice.y = (dice._board.height / 2) - dice._board._BoxSize/2;

					if (this._isLocal) {
						this._chat.addMessage(this.Players[this.player_turn].name+" turn now", 0);
					} else {
						this._chat.addMessage("Your turn now", 0);
					}
				} else {
					this._chat.addMessage("Waiting for "+this.Players[this.player_turn].name, 0);
				}
			}
		} else {
			this.player_turn = null;
			this._chat.addMessage("Waiting for "+(data.max_players-data.players)+" players", 0);
			PIXI.Loader.shared.resources.notification.sound.play();
		}
		this.setReady();
	}
	onServerError(error) {
		this.loadMainMenu();
		this.spinner.hide();
		Swal.fire(
		  'Oops!',
		  `${error}`,
		  'error'
		)
	}

	onGameUpdate(action) {
		let data = action.data;
		switch(action.action) {
			case "roll":
				this._board._Dice._rotationdirection = data.rotationdirection;
				this._board._Dice._power = data.power;
				this._board._Dice._acceleration.x = (data.acceleration ? data.acceleration.x || 0 : 0);
				this._board._Dice._acceleration.y = (data.acceleration ? data.acceleration.y || 0 : 0);
				this._board._Dice.roll(action.data.number, false);
				break;
			case "move":
				this.Players[data.player].Pieces[data.piece].move_alt(data.old_pos, data.new_pos);
				break;
		}
	}
	onGameError(error) {
		this.spinner.hide();
		Swal.fire(
		  'Sorry',
		  `${error}`,
		  'error'
		)
	}

	onMessage(msg) {
		this._chat.addMessage(msg.msg, msg.source);
	}

	startApp() {
		this._app = new PIXI.Application({
			resolution: window.devicePixelRatio || 1,
			resizeTo: window,
			autoResize: true,
			autoDensity: true,
			antialias: true,
			forceFXAA: true,
			powerPreference: 'high-performance',
			transparent: true
		});
		this._app.ROUND_PIXELS = true;
		document.body.appendChild(this._app.view);

		this._uSize = Math.min(this._app.screen.width, this._app.screen.height);
		this._isPortrait = this._app.screen.height > this._app.screen.width;

		this._loadApp();
	}
	_loadApp() {
		var loader_progress = new PIXI.Text('Loading  0%', {fontFamily : 'Lato', fontSize: this._uSize/10, fill : TEXT, align : 'center'});
		loader_progress.x = (this._app.screen.width / 2) - (loader_progress.width / 2);
		loader_progress.y = (this._app.screen.height / 2) - (loader_progress.height / 2);
		this._app.stage.addChild(loader_progress);

		const loader = PIXI.Loader.shared;
		loader.add('piece', '/static/resources/images/piece.json')
			  .add('icons', '/static/resources/images/icons.json')
			  .add('dice', '/static/resources/images/dice.json')
			  .add('logo', '/static/resources/images/logo.png')
			  .add('flame', '/static/resources/images/flame.png')
			  .add('game_started', '/static/resources/sounds/game_started.wav')
			  .add('game_over', '/static/resources/sounds/game_over.wav')
			  .add('notification', '/static/resources/sounds/notification.wav')
			  .add('move', '/static/resources/sounds/move.wav')
			  .add('victory', '/static/resources/sounds/victory.wav')
			  .add('winning', '/static/resources/sounds/winning.wav')
			  .add('roll_dice', '/static/resources/sounds/roll_dice.wav')
			  .add('rolled_dice', '/static/resources/sounds/rolled_dice.wav')
			  .add('first_step', '/static/resources/sounds/first_step.wav')
			  .add('eat', '/static/resources/sounds/eat.wav');
		loader.load();
		loader.onProgress.add((e) => {loader_progress.text = 'Loading '+Math.floor(e.progress)+'%'});
		loader.onComplete.add(() => {this._startApp()});
	}
	_startApp() {
		this._onlineplayers = new PIXI.Text('', {fontFamily : 'Lato', fontSize: this._uSize/40, fill : TEXT, align : 'center'});
		this._onlineplayers.x = 10;
		this._onlineplayers.y = this._app.screen.height - (this._onlineplayers.height + 10);

		this._info = new PIXI.Text('@s77rt', {fontFamily : 'Lato', fontSize: this._uSize/40, fill : TEXT, align : 'center'});
		this._info.interactive = true;
		this._info.buttonMode = true;
		this._info.on('pointerdown', function() {
			Swal.fire({
				title: "Feedback",
				html: 'Enjoy the game? Share it :)<br><br>For feedback kindly reach me by:<br><a href="mailto:admin@abdelhafidh.com" style="color: #dddddd">Email</a> or <a href="https://t.me/s77rt" style="color: #dddddd" target="_blank">Telegram</a><br><br><br><br>All rights reserved &copy; - s77rt',
				confirmButtonText: "Cool, Thanks"
			});
		})
		this._info.x = this._app.screen.width - (this._info.width + 10);
		this._info.y = this._app.screen.height - (this._info.height + 10);

		this._settings = new PIXI.Text('⚙ Settings', {fontFamily : 'Lato', fontSize: this._uSize/40, fill : TEXT, align : 'center'});
		this._settings.interactive = true;
		this._settings.buttonMode = true;
		this._settings.on('pointerdown', function() {
			Swal.fire({
			  title: "Settings",
			  html:
				'Volume ( <span id="volume">100</span>% )<br>'+
				'<div class="slidecontainer"><input id="swal-volume-settings" class="swal2-range slider" min="0" max="1" step="0.01" value="1" type="range"></div>'+
				'<br>Player Name<br>'+
				'<input id="playername" type="text" class="swal2-input" placeholder="Your name...">',
			onBeforeOpen: () => {
				const content = Swal.getContent();
				if (content) {
					const volume = content.querySelector('#volume');
					volume.innerText = Math.floor(PIXI.sound.volumeAll*100);
					const volume_controller = content.querySelector('#swal-volume-settings');
					volume_controller.value = PIXI.sound.volumeAll;
					volume_controller.addEventListener("input", function() {
						PIXI.sound.volumeAll = volume_controller.value;
						volume.innerText = Math.floor(PIXI.sound.volumeAll*100);
					});

					const playername = content.querySelector('#playername');
					playername.value = (localStorage.getItem('playername') || '').replace(/[^\w]/gi, '').trim().substring(0, 15) || 'Player'+random_number();
					playername.addEventListener("input", function(){
						let tmp_name = playername.value.replace(/[^\w]/gi, '').trim().substring(0, 15);
						let name = tmp_name || 'Player'+random_number();
						playername.value = tmp_name;
						localStorage.setItem('playername', name);
						this.playername = name;
					}.bind(this));
				}
			},
			  confirmButtonText: "Looks Great"
			});
		}.bind(this));
		this._settings.x = this._app.screen.width - (this._settings.width + 10);
		this._settings.y = 10;

		this._mainmenu = new Game_MainMenu(this);
		this._board = new Game_Board(this);
		this._control = new Game_Control(this);
		this._chat = new Game_Chat(this);
		this._banner = new Game_Banner(this);

		this.Players = {
			1: new Game_Player(this, 1),
			2: new Game_Player(this, 2),
			3: new Game_Player(this, 3),
			4: new Game_Player(this, 4)
		}
		this._isPrivate = false;
		this._isLocal = false;
		this._localPaused = 0; // 0: not paused, 1: pause requested, 2: paused
		this._localLastServerUpdate = {};
		this._localPlayers = [];
		this._localBots = [];

		this.loadMainMenu();
	}
	loadMainMenu() {
		this._chat.hide();
		this._chat.reset();
		this._banner.hide();
		this._banner.reset();
		this._board.reset();
		this._app.stage.removeChildren();
		this._mainmenu.interactiveChildren = true;
		this._app.stage.addChild(this._onlineplayers, this._info, this._settings, this._mainmenu);
		this.OnlinePlayers();
		this.brand.style.display = "block";
	}
	loadBoard(isPrivate, isLocal) {
		this.brand.style.display = "none";
		this._app.stage.removeChildren();
		this._isPrivate = isPrivate;
		this._isLocal = isLocal;
		this._board.reset();
		this._app.stage.addChild(this._control, this._board);
		this._chat.reset();
		this._chat.show();
		this._banner.reset();
		this._banner.show();
	}
}

class Game_Chat {
	constructor(game) {
		this._game = game;

		this._box = document.createElement('p');

		var x, y, box_width, box_height;
		if (this._game._isPortrait) {
			x = this._game._control._mute.x + this._game._control._mute.width + this._game._board._BoxSize/2;
			y = 0;
			this._box.style.bottom = y+'px';
			this._box.style.left = x+'px';
			box_width = this._game._control._chat.x - (this._game._control._mute.x + this._game._control._mute.width) - (2*this._game._board._BoxSize/2);
			box_height = this._game._board._BoxSize/2 + (this._game._app.screen.height - (15*this._game._board._BoxSize + 2*this._game._board._BoxSize/2))/2;
		} else {
			x = 0;
			y = this._game._control._play.y + this._game._control._play.height + this._game._board._BoxSize/2;
			this._box.style.top = y+'px';
			this._box.style.right = x+'px';
			box_width = this._game._board._BoxSize/2 + (this._game._app.screen.width - (15*this._game._board._BoxSize + 2*this._game._board._BoxSize/2))/2;
			box_height = this._game._control._chat.y - (this._game._control._play.y + this._game._control._play.height) - (2*this._game._board._BoxSize/2);
		}

		this._box.style.position = 'absolute';
		this._box.style.background = 'black';
		this._box.style.color = '#dddddd';
		this._box.style.fontSize = (box_width/20)+'px';
		this._box.style.width = box_width+'px';
		this._box.style.height = box_height+'px';
		this._box.style.zIndex = 100;
		this._box.style.display = "none";
		document.body.appendChild(this._box);
	}
	reset() {
		this._box.innerHTML = "";
	}
	show() {
		this._box.style.display = "block";
	}
	hide() {
		this._box.style.display = "none";
	}
	addMessage(msg, source) {
		var person;
		msg = msg.replace(/[^\w\s]/gi, '').trim().substring(0, 128);
		let color = COLOR_MAP[source].toString(16).padStart(6, '0');
		if (source === 0)  {
			person = "System";

			if (msg.startsWith('You '))
				msg = msg.replace('You ', '<span style="color: #'+COLOR_MAP[this._game.my_seq_id].toString(16).padStart(6, '0')+'">You </span>');
			else if (msg.startsWith('Your '))
				msg = msg.replace('Your ', '<span style="color: #'+COLOR_MAP[this._game.my_seq_id].toString(16).padStart(6, '0')+'">Your </span>');

			if (this._game.player_turn > 0) {
				let current_player = this._game.Players[this._game.player_turn].name;
				if (this._game._isLocal) {
					if (msg.startsWith(current_player+' '))
						msg = msg.replace(current_player+' ', '<span style="color: #'+COLOR_MAP[this._game.player_turn].toString(16).padStart(6, '0')+'">'+current_player+' </span>');
				} else {
					if (msg.endsWith(current_player))
						msg = msg.replace(current_player, '<span style="color: #'+COLOR_MAP[this._game.player_turn].toString(16).padStart(6, '0')+'">'+current_player+'</span>');
				}
			}
		} else {
			person = this._game.Players[source].name;
		}
		person = person.replace(/[^\w]/gi, '').trim().substring(0, 15);
		this._box.innerHTML += '<span style="color: #'+color+'">'+person+':</span> '+msg+'<br>';
		this._box.scrollTop = this._box.scrollHeight;
	}
}

class Game_Banner {
	constructor(game) {
		this._game = game;

		this._box = document.createElement('p');

		var x, y, box_width, box_height;
		if (this._game._isPortrait) {
			x = this._game._control._quit.x + this._game._control._quit.width + this._game._board._BoxSize/2;
			y = 0;
			this._box.style.top = y+'px';
			this._box.style.left = x+'px';
			box_width = this._game._control._play.x - (this._game._control._quit.x + this._game._control._quit.width) - (2*this._game._board._BoxSize/2);
			box_height = (this._game._app.screen.height - (15*this._game._board._BoxSize + 2*this._game._board._BoxSize))/2;
		} else {
			x = 0;
			y = this._game._control._quit.y + this._game._control._quit.height + this._game._board._BoxSize/2;
			this._box.style.top = y+'px';
			this._box.style.left = x+'px';
			box_width = (this._game._app.screen.width - (15*this._game._board._BoxSize + 2*this._game._board._BoxSize))/2;
			box_height = this._game._control._mute.y - (this._game._control._quit.y + this._game._control._quit.height) - (2*this._game._board._BoxSize/2);
		}

		this._box.style.position = 'absolute';
		this._box.style.background = 'black';
		this._box.style.color = '#dddddd';
		this._box.style.fontSize = (box_width/20)+'px';
		this._box.style.width = box_width+'px';
		this._box.style.height = box_height+'px';
		this._box.style.zIndex = 100;
		this._box.style.display = "none";
		this._box.style.textAlign = "center";
		this._box.innerHTML = "Advertisement";
		document.body.appendChild(this._box);
	}
	reset() {
		return;
		//this._box.innerHTML = "";
	}
	show() {
		this._box.style.display = "block";
	}
	hide() {
		this._box.style.display = "none";
	}
}

class Game_Control extends PIXI.Container {
	constructor(game) {
		super();
		this._game = game;

		this._quit = new Game_Control_Button(this, "exit", function() {
			Swal.fire({
			  title: 'Are you sure you want to quit?',
			  icon: 'question',
			  showCancelButton: true,
			  confirmButtonText: 'Yes, Leave',
			  cancelButtonText: 'No, Stay',
			  confirmButtonColor: '#d33',
			}).then((result) => {
				if (result.value) {
					if (!this._isLocal)
						this.LeaveServer();
					this.loadMainMenu();
				}
			});
		}.bind(game));
		this._quit.x = this._game._board._BoxSize/2;
		this._quit.y = this._game._board._BoxSize/2;
		this.addChild(this._quit);

		this._play = new Game_Control_Button(this, "play", function() {
			if (this._game.player_turn) {
				if (this._game._isLocal) {
					if (this._game._localPaused === 2) {
						this._game.ResumeGame();
					} else if (this._game._localPaused === 0) {
						this._game.PauseGame(); 
					}
				} else {
					Swal.fire(
					  'Not allowed',
					  'The current match cannot be paused',
					  'error'
					)
				}
			} else if (this._game._isLocal) {
				this._game.StartGame();
			} else {
				Swal.fire({
				  title: 'The table is not full',
				  icon: 'warning',
				  showCancelButton: true,
				  confirmButtonText: 'Start the game now',
				  cancelButtonText: 'Wait for more players',
				  confirmButtonColor: '#d33',
				}).then((result) => {
					if (result.value) {
						this._game.StartGame();
					}
				});
			}
		}.bind(this));
		this._play.x = (this._game._app.screen.width - this._play.width) - this._game._board._BoxSize/2;
		this._play.y = this._game._board._BoxSize/2;
		this.addChild(this._play);

		this._mute = new Game_Control_Button(this, "mute", function() {
			let muted = PIXI.sound.toggleMuteAll();
			if (muted) {
				this._mute.texture = PIXI.Loader.shared.resources.icons.textures['unmute'];
			} else {
				this._mute.texture = PIXI.Loader.shared.resources.icons.textures['mute'];
			}
		}.bind(this));
		this._mute.x = this._game._board._BoxSize/2;
		this._mute.y = (this._game._app.screen.height - this._mute.height) - this._game._board._BoxSize/2;
		this.addChild(this._mute);

		this._chat = new Game_Control_Button(this, "chat", async function() {
			if (this._isPrivate === true) {
				var { value: msg } = await Swal.fire({
				  input: 'text',
				  inputPlaceholder: 'Type your message here...',
				  showCancelButton: true,
				  confirmButtonText: 'Send',
				  inputValidator: (value) => {
					value = value.replace(/[^\w\s]/gi, '').trim();
					if (!value) {
						return 'You need to write something!';
					} else if (value.length > 128) {
						return 'Your message is too long (> 128)';
					}
				  }
				});
				msg = msg || '';
				msg = msg.replace(/[^\w\s]/gi, '').trim().substring(0, 128);
				if (msg.length) {
					if (!this._isLocal)
						this.Message(msg);
					this._chat.addMessage(msg, this.my_seq_id);
				}
			} else {
				Swal.fire(
				  'Oops!',
				  'Chat is not available in public matches',
				  'error'
				)
			}
		}.bind(this._game));
		this._chat.x = (this._game._app.screen.width - this._mute.width) - this._game._board._BoxSize/2;
		this._chat.y = (this._game._app.screen.height - this._chat.height) - this._game._board._BoxSize/2;
		this.addChild(this._chat);
	}
}
class Game_Control_Button extends PIXI.Sprite {
	constructor(control, text, action) {
		super(PIXI.Loader.shared.resources.icons.textures[text]);
		this._control = control;

		this.custom_scale(1.5);
		this.buttonMode = true;
		this.interactive = true;
		this._action = action;

		this.on('pointerover', function() {
			this.tint = 0xc6ffdd;
		});
		this.on('pointerout', function() {
			this.tint = 0xffffff;
		});
		this.on('pointerdown', function() {
			this._action();
		});
	}
	custom_scale(s) {
		this.scale.set((s*this._control._game._uSize)/(256*10));
	}
}

class Game_MainMenu extends PIXI.Container {
	constructor(game) {
		super();
		this._game = game;

		this._logo = new PIXI.Sprite(PIXI.Loader.shared.resources.logo.texture);
		this._logo.scale.set(1.2*0.9, 1.2*0.8);
		this._logo.x = (290/2) - this._logo.width/2;
		this.addChild(this._logo);

		this._numberOfButtons = 0;

		this.addButton("🌐 Play Online", this._game.AutoServer.bind(this._game));
		this.addButton("👑 Host Private", function() {
			this.HostServer(true);
		}.bind(this._game));
		this.addButton("🎩 Join Private", async function() {
			const { value: server_id } = await Swal.fire({
			  title: 'Please enter table id',
			  input: 'number',
			  showCancelButton: true,
			  inputValidator: (value) => {
				if (!value) {
				  return 'You need to enter table id';
				}
			  }
			});
			if (server_id)
				this.JoinServer(server_id);
			else
				this._mainmenu.interactiveChildren = true;
		}.bind(this._game));
		this.addButton("🔌 Play Offline", this._game.LocalServer.bind(this._game));

		this.scale.y = 0.8*(this._game._app.screen.height/this.height);
		this.scale.x = 0.9*this.scale.y;
		this.x = (this._game._app.screen.width / 2) - (this.width / 2);
		this.y = (this._game._app.screen.height / 2) - (this.height / 2);
	}
	addButton(text, action) {
		let button = new Game_MainMenu_Button(this, text, action);
		button.y = 1.5*(this._logo.height)+(this._logo.y)+(1.25*50 * this._numberOfButtons);
		this._numberOfButtons++;
		this.addChild(button);
	}
}
class Game_MainMenu_Button extends PIXI.Container {
	constructor(mainmenu, text, action) {
		super();
		this._mainmenu = mainmenu;

		this._buttonText = new PIXI.Text(text, {fontFamily : 'Lato', fontSize: 26, fill : TEXT, align : 'center'});

		this._buttonFrame = new PIXI.Graphics();
		this._buttonFrame.lineStyle(1, TEXT);
		this._buttonFrame.drawRect(0, 0, 290, 50);
		this._buttonFrame.cacheAsBitmap = true;
		
		this._buttonText.x = (this._buttonFrame.width / 2) - (this._buttonText.width / 2);
		this._buttonText.y = (this._buttonFrame.height / 2) - (this._buttonText.height / 2);

		this.buttonMode = true;
		this.interactive = true;
		this._action = action;

		this.on('pointerover', function() {
			this._buttonFrame.alpha = 0.5;
		});
		this.on('pointerout', function() {
			this._buttonFrame.alpha = 1;
		});
		this.on('pointerdown', function() {
			this._mainmenu.interactiveChildren = false;
			this._action();
		});

		this.addChild(this._buttonFrame, this._buttonText);
	}
}

class Game_Board extends PIXI.Container {
	constructor(game) {
		super();
		this._game = game;

		this.sortableChildren = true;

		this._BoxSize = this._game._uSize / 15;

		this.addBoardGraphics();
		this.addPathes();
		this.addHomes();
		this.addDice();

		this.x = Math.max((this._game._app.screen.width / 2) - (this.width / 2), 0);
		this.y = Math.max((this._game._app.screen.height / 2) - (this.height / 2), 0);
	}
	addBoardGraphics() {
		this._BoardGraphics = new PIXI.Graphics();
		this._BoardGraphics.lineStyle(this._BoxSize/2, 0x222222);
		this._BoardGraphics.beginFill(BOARD);
		this._BoardGraphics.drawRect(-this._BoxSize/4, -this._BoxSize/4, 15*this._BoxSize + this._BoxSize/2, 15*this._BoxSize + this._BoxSize/2);
		this._BoardGraphics.endFill();
		this._BoardGraphics.lineStyle(1, BORDER);
		for (var i = 6 - 1; i >= 0; i--) {
			this._BoardGraphics.drawRect(i*this._BoxSize, 8*this._BoxSize, this._BoxSize, this._BoxSize);
			this._BoardGraphics.drawRect(6*this._BoxSize, i*this._BoxSize, this._BoxSize, this._BoxSize);
			this._BoardGraphics.drawRect((9+i)*this._BoxSize, 6*this._BoxSize, this._BoxSize, this._BoxSize);
			this._BoardGraphics.drawRect(8*this._BoxSize, (9+i)*this._BoxSize, this._BoxSize, this._BoxSize);

			if (i == 0) {
				this._BoardGraphics.drawRect(i*this._BoxSize, 7*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.drawRect(7*this._BoxSize, i*this._BoxSize, this._BoxSize, this._BoxSize);
			} else {
				this._BoardGraphics.beginFill(RED);
				this._BoardGraphics.drawRect(i*this._BoxSize, 7*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
				this._BoardGraphics.beginFill(GREEN);
				this._BoardGraphics.drawRect(7*this._BoxSize, i*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
			}

			if (i == 1) {
				this._BoardGraphics.beginFill(RED);
				this._BoardGraphics.drawRect(i*this._BoxSize, 6*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
				this._BoardGraphics.beginFill(GREEN);
				this._BoardGraphics.drawRect(8*this._BoxSize, i*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
			} else {
				this._BoardGraphics.drawRect(i*this._BoxSize, 6*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.drawRect(8*this._BoxSize, i*this._BoxSize, this._BoxSize, this._BoxSize);
			}

			if (i == 4) {
				this._BoardGraphics.beginFill(YELLOW);
				this._BoardGraphics.drawRect((9+i)*this._BoxSize, 8*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
				this._BoardGraphics.beginFill(BLUE);
				this._BoardGraphics.drawRect(6*this._BoxSize, (9+i)*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
			} else {
				this._BoardGraphics.drawRect((9+i)*this._BoxSize, 8*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.drawRect(6*this._BoxSize, (9+i)*this._BoxSize, this._BoxSize, this._BoxSize);
			}

			if (i == 5) {
				this._BoardGraphics.drawRect((9+i)*this._BoxSize, 7*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.drawRect(7*this._BoxSize, (9+i)*this._BoxSize, this._BoxSize, this._BoxSize);
			} else {
				this._BoardGraphics.beginFill(YELLOW);
				this._BoardGraphics.drawRect((9+i)*this._BoxSize, 7*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
				this._BoardGraphics.beginFill(BLUE);
				this._BoardGraphics.drawRect(7*this._BoxSize, (9+i)*this._BoxSize, this._BoxSize, this._BoxSize);
				this._BoardGraphics.endFill();
			}
		}

		this._BoardGraphics.beginFill(RED);
		this._BoardGraphics.moveTo(6*this._BoxSize, 6*this._BoxSize);
		this._BoardGraphics.lineTo(7.5*this._BoxSize, 7.5*this._BoxSize);
		this._BoardGraphics.lineTo(6*this._BoxSize, 9*this._BoxSize);
		this._BoardGraphics.endFill();

		this._BoardGraphics.beginFill(GREEN);
		this._BoardGraphics.moveTo(6*this._BoxSize, 6*this._BoxSize);
		this._BoardGraphics.lineTo(7.5*this._BoxSize, 7.5*this._BoxSize);
		this._BoardGraphics.lineTo(9*this._BoxSize, 6*this._BoxSize);
		this._BoardGraphics.endFill();

		this._BoardGraphics.beginFill(YELLOW);
		this._BoardGraphics.moveTo(9*this._BoxSize, 6*this._BoxSize);
		this._BoardGraphics.lineTo(7.5*this._BoxSize, 7.5*this._BoxSize);
		this._BoardGraphics.lineTo(9*this._BoxSize, 9*this._BoxSize);
		this._BoardGraphics.endFill();

		this._BoardGraphics.beginFill(BLUE);
		this._BoardGraphics.moveTo(6*this._BoxSize, 9*this._BoxSize);
		this._BoardGraphics.lineTo(7.5*this._BoxSize, 7.5*this._BoxSize);
		this._BoardGraphics.lineTo(9*this._BoxSize, 9*this._BoxSize);
		this._BoardGraphics.endFill();

		this._BoardGraphics.cacheAsBitmap = false;
		this.addChild(this._BoardGraphics);
	}
	addHomes() {
		this._BoardHomeRed = new Game_Board_Home(this, RED, RED_2, 1);
		this._BoardHomeGreen = new Game_Board_Home(this, GREEN, GREEN_2, 2);
		this._BoardHomeYellow = new Game_Board_Home(this, YELLOW, YELLOW_2, 3);
		this._BoardHomeBlue = new Game_Board_Home(this, BLUE, BLUE_2, 4);
		this.addChild(this._BoardHomeRed, this._BoardHomeGreen, this._BoardHomeYellow, this._BoardHomeBlue);
	}
	addDice() {
		this._Dice = new Game_Board_Dice(this);
		this.addChild(this._Dice);
	}
	addPathes() {
		this._Path_RED = [];
		this._Path_RED[0] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[1] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[2] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[3] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[4] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[5] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[6] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[7] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[8] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[9] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[10] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[11] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[12] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[13] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[14] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[15] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[16] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[17] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[18] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[19] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[20] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[21] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[22] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[23] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[24] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[25] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[26] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[27] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[28] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[29] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[30] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[31] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[32] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[33] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[34] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[35] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[36] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[37] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[38] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[39] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[40] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[41] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[42] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[43] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[44] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[45] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[46] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[47] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[48] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[49] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[50] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[51] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[52] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[53] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[54] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[55] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[56] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[57] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_RED[58] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};

		this._Path_GREEN = [];
		this._Path_GREEN[0] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[1] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[2] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[3] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[4] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[5] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[6] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[7] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[8] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[9] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[10] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[11] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[12] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[13] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[14] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[15] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[16] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[17] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[18] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[19] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[20] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[21] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[22] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[23] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[24] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[25] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[26] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[27] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[28] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[29] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[30] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[31] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[32] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[33] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[34] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[35] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[36] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[37] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[38] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[39] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[40] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[41] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[42] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[43] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[44] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[45] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[46] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[47] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[48] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[49] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[50] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[51] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[52] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[53] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[54] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[55] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[56] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[57] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_GREEN[58] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};

		this._Path_YELLOW = [];
		this._Path_YELLOW[0] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[1] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[2] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[3] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[4] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[5] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[6] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[7] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[8] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[9] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[10] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[11] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[12] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[13] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[14] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[15] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[16] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[17] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[18] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[19] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[20] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[21] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[22] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[23] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[24] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[25] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[26] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[27] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[28] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[29] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[30] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[31] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[32] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[33] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[34] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[35] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[36] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[37] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[38] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[39] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[40] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[41] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[42] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[43] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[44] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[45] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[46] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[47] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[48] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[49] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[50] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[51] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[52] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[53] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[54] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[55] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[56] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[57] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_YELLOW[58] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};

		this._Path_BLUE = [];
		this._Path_BLUE[0] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[1] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[2] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[3] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[4] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[5] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[6] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[7] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[8] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[9] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[10] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[11] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[12] = {x: round((0*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[13] = {x: round((1*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[14] = {x: round((2*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[15] = {x: round((3*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[16] = {x: round((4*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[17] = {x: round((5*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[18] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[19] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[20] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[21] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[22] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[23] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[24] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[25] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((0*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[26] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((1*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[27] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((2*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[28] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((3*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[29] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((4*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[30] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((5*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[31] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[32] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[33] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[34] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[35] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[36] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((6*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[37] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((7*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[38] = {x: round((14*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[39] = {x: round((13*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[40] = {x: round((12*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[41] = {x: round((11*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[42] = {x: round((10*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[43] = {x: round((9*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[44] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[45] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[46] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[47] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[48] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[49] = {x: round((8*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[50] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[51] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((14*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[52] = {x: round((6*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[53] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((13*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[54] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((12*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[55] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((11*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[56] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((10*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[57] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((9*this._BoxSize)+(this._BoxSize/2))};
		this._Path_BLUE[58] = {x: round((7*this._BoxSize)+(this._BoxSize/2)), y: round((8*this._BoxSize)+(this._BoxSize/2))};
	}
	reset() {
		this._Dice.x = (this.width / 2) - this._BoxSize/2;
		this._Dice.y = (this.height / 2) - this._BoxSize/2;
		this._Dice.rotation = 0;
		this._Dice.setInteractive(false);
		this._Dice.changeColor(0xffffff);
		this._Dice.texture = this._Dice.textures[0];
		Object.values(this._game.Players).forEach(function(player) {
			player.clearInfo();
			player.clearTimer();
			Object.values(player.Pieces).forEach(function(piece) {
				piece.send_home();
				piece.mark_as_ineligible();
			});
		});
	}
}
class Game_Board_Home extends PIXI.Graphics {
	constructor(board, color, color_2, seq_id) {
		super();
		this._board = board;
		this.lineStyle(1, BORDER);
		this.beginFill(color);
		this._room = [];
		switch(seq_id) {
			case 1:
				this.drawRect(0, 0, 6*this._board._BoxSize, 6*this._board._BoxSize);
				this.endFill();
				this.beginFill(color_2);
				this.drawCircle(3*this._board._BoxSize, 3*this._board._BoxSize, 2.5*this._board._BoxSize);
				this._room.push({x: round(2*this._board._BoxSize), y: round(2*this._board._BoxSize)});
				this._room.push({x: round(4*this._board._BoxSize), y: round(2*this._board._BoxSize)});
				this._room.push({x: round(2*this._board._BoxSize), y: round(4*this._board._BoxSize)});
				this._room.push({x: round(4*this._board._BoxSize), y: round(4*this._board._BoxSize)});
				break;
			case 2:
				this.drawRect(9*this._board._BoxSize, 0, 6*this._board._BoxSize, 6*this._board._BoxSize);
				this.endFill();
				this.beginFill(color_2);
				this.drawCircle(12*this._board._BoxSize, 3*this._board._BoxSize, 2.5*this._board._BoxSize);
				this._room.push({x: round(11*this._board._BoxSize), y: round(2*this._board._BoxSize)});
				this._room.push({x: round(13*this._board._BoxSize), y: round(2*this._board._BoxSize)});
				this._room.push({x: round(11*this._board._BoxSize), y: round(4*this._board._BoxSize)});
				this._room.push({x: round(13*this._board._BoxSize), y: round(4*this._board._BoxSize)});
				break;
			case 3:
				this.drawRect(9*this._board._BoxSize, 9*this._board._BoxSize, 6*this._board._BoxSize, 6*this._board._BoxSize);
				this.endFill();
				this.beginFill(color_2);
				this.drawCircle(12*this._board._BoxSize, 12*this._board._BoxSize, 2.5*this._board._BoxSize);
				this._room.push({x: round(11*this._board._BoxSize), y: round(11*this._board._BoxSize)});
				this._room.push({x: round(13*this._board._BoxSize), y: round(11*this._board._BoxSize)});
				this._room.push({x: round(11*this._board._BoxSize), y: round(13*this._board._BoxSize)});
				this._room.push({x: round(13*this._board._BoxSize), y: round(13*this._board._BoxSize)});
				break;
			case 4:
				this.drawRect(0, 9*this._board._BoxSize, 6*this._board._BoxSize, 6*this._board._BoxSize);
				this.endFill();
				this.beginFill(color_2);
				this.drawCircle(3*this._board._BoxSize, 12*this._board._BoxSize, 2.5*this._board._BoxSize);
				this._room.push({x: round(2*this._board._BoxSize), y: round(11*this._board._BoxSize)});
				this._room.push({x: round(4*this._board._BoxSize), y: round(11*this._board._BoxSize)});
				this._room.push({x: round(2*this._board._BoxSize), y: round(13*this._board._BoxSize)});
				this._room.push({x: round(4*this._board._BoxSize), y: round(13*this._board._BoxSize)});
				break;
		}
		this.endFill();
		this.lineStyle(1, BORDER);
		this.beginFill(BOARD);
		this._room.forEach(function(room) {
			this.drawCircle(room.x, room.y, 0.55*this._board._BoxSize);
		}, this);
		this.endFill();
		this.cacheAsBitmap = false;
	}
}
class Game_Board_Dice extends PIXI.AnimatedSprite {
	constructor(board) {
		super(Object.values(PIXI.Loader.shared.resources.dice.textures).slice(0, 24));

		this._board = board;
		this.zIndex = 5000;
		this.anchor.set(0.5);

		this.x = (this._board.width / 2) - this._board._BoxSize/2;
		this.y = (this._board.height / 2) - this._board._BoxSize/2;
		this.rotation = 0;

		this.new_x = this.x;
		this.new_y = this.y;
		this.new_rotation = this.rotation;

		this.custom_scale(1.75);

		this._value = null;

		this._speed = 100;
		this._direction = 0;
		this._rotationdirection = 0;
		this._power = 0;
		this._acceleration = {x: 0, y: 0};

		this.buttonMode = true;
		this.interactive = false;

		this.loop = true;
		this.animationSpeed = 3;

		this.timeline = gsap.timeline();
		this.timeline_onStart = function() {
			let dice = this._targets[0];

			dice.new_x = dice.x + this.data.x_plus;
			dice.new_y = dice.y + this.data.y_plus;
			dice.new_rotation = dice.rotation + this.data.rotation_plus;
		}
		this.timeline_onUpdate = function(expect_x_overflow) {
			if (this.data.killed === true)
				return;

			let dice = this._targets[0];

			let x_overflow_left = dice.x - dice.width/2 < 0;
			let x_overflow_right = dice.x + dice.width/2 > 15*dice._board._BoxSize;
			let x_overflow = x_overflow_left || x_overflow_right;

			let y_overflow_up = dice.y - dice.height/2 < 0;
			let y_overflow_down = dice.y + dice.height/2 > 15*dice._board._BoxSize;
			let y_overflow = y_overflow_up || y_overflow_down;

			if (x_overflow || y_overflow) {
				let progress = this.totalProgress();
				let duration = this.totalDuration();
				let left_time = duration*(1-progress);
				let x_plus;
				let y_plus;
				let rotation_plus;
				
				if (x_overflow && expect_x_overflow) {
					x_plus = -1*this.data.x_plus*(1-0.5);
					y_plus = this.data.y_plus*(1-0.5);

					if (x_overflow_left) {
						dice.x = dice.width/2;
					} else if (x_overflow_right) {
						dice.x = 15*dice._board._BoxSize - dice.width/2;
					}
					dice.y = dice.new_y;
				} else if (y_overflow && !expect_x_overflow) {
					x_plus = this.data.x_plus*(1-0.5);
					y_plus = -1*this.data.y_plus*(1-0.5);

					if (y_overflow_up) {
						dice.y = dice.height/2;
					} else if (y_overflow_down) {
						dice.y = 15*dice._board._BoxSize - dice.height/2;
					}
					dice.x = dice.new_x;
				} else {
					return;
				}

				dice.rotation = dice.new_rotation;
				rotation_plus = -1*this.data.rotation_plus*(1-0.5);

				this.kill();
				this.data.killed = true;

				let new_expect_x_overflow_left = dice.x+x_plus - dice.width/2 < 0;
				let new_expect_x_overflow_right = dice.x+x_plus + dice.width/2 > 15*dice._board._BoxSize;
				let new_expect_x_overflow =  new_expect_x_overflow_left || new_expect_x_overflow_right;
				
				dice.timeline.to(dice, {
					duration: left_time,
					x: "+="+x_plus,
					y: "+="+y_plus,
					rotation: "+="+rotation_plus,
					ease: 'power1.out',
					onStart: dice.timeline_onStart,
					onUpdate: dice.timeline_onUpdate,
					onUpdateParams: [new_expect_x_overflow],
					data: {
						x_plus: x_plus,
						y_plus: y_plus,
						rotation_plus: rotation_plus,
					}
				}, '+=0');
			}
		}

		this._emitter = new PIXI.particles.Emitter(
			this._board,
			[PIXI.Loader.shared.resources.flame.texture],
			{
				"alpha": {
					"start": 0.8,
					"end": 0.1
				},
				"scale": {
					"start": this.emitter_custom_scale(1),
					"end": this.emitter_custom_scale(0.3),
					"minimumScaleMultiplier": 1
				},
				"color": {
					"start": "#ffffff",
					"end": "#0000ff"
				},
				"speed": {
					"start": 200,
					"end": 100,
					"minimumSpeedMultiplier": 1
				},
				"acceleration": {
					"x": 0,
					"y": 0
				},
				"maxSpeed": 0,
				"startRotation": {
					"min": 0,
					"max": 360
				},
				"noRotation": false,
				"rotationSpeed": {
					"min": 0,
					"max": 0
				},
				"lifetime": {
					"min": 0.5,
					"max": 0.5
				},
				"blendMode": "normal",
				"frequency": 0.05,
				"emitterLifetime": 1.1,
				"maxParticles": 500,
				"pos": {
					"x": 0,
					"y": 0
				},
				"addAtBack": false,
				"spawnType": "point"
			}
		);
		this._emitter.OwnerPos = this.position;
		this._emitter_elapsed = Date.now();
		this._emitter_update = function() {
			requestAnimationFrame(this._emitter_update);
			var now = Date.now();
			this._emitter.updateOwnerPos(this.x, this.y);
			this._emitter.update((now - this._emitter_elapsed) * 0.001);
			this._emitter_elapsed = now;
		}.bind(this);

		this
			.on('pointerdown', this.onDragStart)
			.on('pointerup', this.onDragEnd)
			.on('pointerupoutside', this.onDragEnd)
			.on('pointermove', this.onDragMove);
	}
	custom_scale(s) {
		this.scale.set((s*this._board._BoxSize)/74);
	}
	emitter_custom_scale(s) {
		return (s*this._board._BoxSize)/44;
	}

	changeColor(color) {
		this.tint = color;
		this._emitter.startColor.value = {
			r: (color >> 16) & 255,
			g: (color >> 8) & 255,
			b: color & 255,
		}
	}

	setInteractive(bool) {
		let t;
		if (this._board._game._isLocal && this._board._game._localBots.includes(this._board._game.my_seq_id)) {
			this.interactive = false;
			t = 500;
		} else {
			this.interactive = bool;
			t = 5*1000;
		}
		if (bool === true) {
			this._board._game.Players[this._board._game.my_seq_id].setTimer(t, function() {
				this._rotationdirection =  Math.random() < 0.5 ? -1 : 1;
				this._power = Math.floor((Math.random() * 4) + 1);
				this._acceleration = {x: (Math.random() < 0.5 ? -1 : 1)*(Math.floor((Math.random() * 100) + 1)), y: (Math.random() < 0.5 ? -1 : 1)*(Math.floor((Math.random() * 100) + 1))};
				this._roll();
			}.bind(this));
		}
	}

	roll(x, my_turn) {
		this.setInteractive(false);
		this._value = x;
		this._board._game.setBusy();

		if (my_turn === true) {
			this._rotationdirection = Math.random() < 0.5 ? -1 : 1;
			this._board._game.UpdateGame({
				action: 'roll',
				data: {
					number: x,
					rotationdirection: this._rotationdirection,
					power: this._power,
					acceleration: this._acceleration,
				},
			});
		}

		this.custom_scale(0.7);

		let x_plus = (this._acceleration.x*this._board._BoxSize*0.025);
		let y_plus = (this._acceleration.y*this._board._BoxSize*0.025);
		let rotation_plus = (this._rotationdirection*this._power*0.5);

		let expect_x_overflow_left = this.x+x_plus - this.width/2 < 0;
		let expect_x_overflow_right = this.x+x_plus + this.width/2 > 15*this._board._BoxSize;
		let expect_x_overflow =  expect_x_overflow_left || expect_x_overflow_right;
		
		this._emitter.maxParticles = Math.min(500, (this._power+0.3)*5);
		PIXI.Loader.shared.resources.roll_dice.sound.volume = Math.min(1, (this._power+0.3));
		PIXI.Loader.shared.resources.roll_dice.sound.play();
		this.play();
		this.start_emitter();
		this.timeline.to(this, {
			duration: 1.1,
			x: "+="+x_plus,
			y: "+="+y_plus,
			rotation: "+="+rotation_plus,
			ease: 'power1.out',
			onStart: this.timeline_onStart,
			onUpdate: this.timeline_onUpdate,
			onUpdateParams: [expect_x_overflow],
			data: {
				x_plus: x_plus,
				y_plus: y_plus,
				rotation_plus: rotation_plus,
			}
		}, '>');
		this.timeline.eventCallback("onComplete", function() {
			this.x = this.new_x;
			this.y = this.new_y;
			this.rotation = this.new_rotation;

			let x_overflow_left = this.x - this.width/2 < 0;
			let x_overflow_right = this.x + this.width/2 > 15*this._board._BoxSize;
			let x_overflow = x_overflow_left || x_overflow_right;

			let y_overflow_up = this.y - this.height/2 < 0;
			let y_overflow_down = this.y + this.height/2 > 15*this._board._BoxSize;
			let y_overflow = y_overflow_up || y_overflow_down;

			if (x_overflow)
				this.x = (this._board.width / 2) - this._board._BoxSize/2;
			if (y_overflow)
				this.y = (this._board.height / 2) - this._board._BoxSize/2;

			this.custom_scale(1.75);
		}.bind(this));

		setTimeout(() => {
			this.stop();
			this.texture = PIXI.Loader.shared.resources.dice.textures['dice-'+x+'.png'];
			PIXI.Loader.shared.resources.rolled_dice.sound.play();
			this._direction = 0;
			this._rotationdirection = 0;
			this._power = 0;
			this._acceleration = {x: 0, y: 0};
			if (my_turn === true)
				this._board._game.Players[this._board._game.my_seq_id].checkMyPieces();
			this._board._game.setReady();
		}, 1.1*1000);
	}
	_roll() {
		this._board._game.Players[this._board._game.my_seq_id].clearTimer();
		this.roll(Math.floor(this._board._game.token() * 6) + 1, true);
	}

	start_emitter() {
		this._emitter_elapsed = Date.now();
		this._emitter.emit = true;
		this._emitter_update();
	}

	onDragStart(event) {
		this.data = event.data;
		this.alpha = 0.5;
		this.dragging = true;
	}
	onDragEnd() {
		if (this.dragging) {
			this.alpha = 1;
			this.dragging = false;
			this.data = null;
			this._roll();
		}
	}
	onDragMove() {
		if (this.dragging) {
			const newPosition = this.data.getLocalPosition(this.parent);
			this._direction = round(Math.atan2(
				newPosition.y - this.y,
				newPosition.x - this.x,
			));
			this._power = round(distanceBetweenTwoPoints(
				newPosition,
				this.position,
			)/this._board._BoxSize);
			this._acceleration = {
				x: round(Math.cos(this._direction) * this._power * this._speed),
				y: round(Math.sin(this._direction) * this._power * this._speed),
			};
		}
	}
}

class Game_Player {
	constructor(game, seq_id) {
		this._game = game;
		
		this._seq_id = seq_id;
		this.percentage = 0;
		this.name = '';
		this.Pieces = {
			1: new Game_Player_Piece(this, 1),
			2: new Game_Player_Piece(this, 2),
			3: new Game_Player_Piece(this, 3),
			4: new Game_Player_Piece(this, 4)
		}
	
		this.Timer = null;

		switch(seq_id) {
			case 1:
				this._text = new PIXI.Text('', {fontFamily: 'Lato', fontSize: 0.35*this._game._board._BoxSize, fill: BORDER, align: 'center'});
				this._text.position.set(3*this._game._board._BoxSize, 0.25*this._game._board._BoxSize);
				break;
			case 2:
				this._text = new PIXI.Text('', {fontFamily: 'Lato', fontSize: 0.35*this._game._board._BoxSize, fill: BORDER, align: 'center'});
				this._text.position.set(12*this._game._board._BoxSize, 0.25*this._game._board._BoxSize);
				break;
			case 3:
				this._text = new PIXI.Text('', {fontFamily: 'Lato', fontSize: 0.35*this._game._board._BoxSize, fill: BORDER, align: 'center'});
				this._text.position.set(12*this._game._board._BoxSize, 14.75*this._game._board._BoxSize);
				break;
			case 4:
				this._text = new PIXI.Text('', {fontFamily: 'Lato', fontSize: 0.35*this._game._board._BoxSize, fill: BORDER, align: 'center'});
				this._text.position.set(3*this._game._board._BoxSize, 14.75*this._game._board._BoxSize);
				break;
		}
		this._text.anchor.set(0.5);
		this._game._board.addChild(this._text);
	}
	updateInfo(name, percentage) {
		this.name = name.replace(/[^\w]/gi, '').trim().substring(0, 15);
		this.percentage = Math.floor(percentage);
		let text = this.name+' ( '+this.percentage+'% )';
		if (this._text.text != text) {
			this._text.text = text;
		}
	}
	updatePercentage() {
		var totalPos = 0;
		Object.values(this.Pieces).forEach(function(piece) {
			totalPos += piece._pos;
		});
		this.percentage = Math.floor(100*((totalPos / 4) / 59));
		let text = this.name+' ( '+this.percentage+'% )';
		this._text.text = text;
		if (this.percentage === 100) {
			this._game._chat.addMessage(this.name+" WON", 0);
			PIXI.Loader.shared.resources.winning.sound.play();
		}
	}
	clearInfo() {
		if (this._text.text != '') {
			this.percentage = 0;
			this.name = '';
			this._text.text = '';
		}
	}
	checkMyPieces() {
		let pieces_that_can_move = [];
		let pieces_that_can_move_positions = [];
		let preferred_pieces_that_can_move = {1: null, 2: null, 3: null, 4: null};
		let extra_offset = this._game._board._Dice._value;

		Object.values(this.Pieces).forEach(function(piece) {
			let p_c = piece.check();
			if (p_c && !pieces_that_can_move_positions.includes(piece._pos)) {
				if (piece._pos === 0) {
					preferred_pieces_that_can_move[2] = piece;
				} else {
					let [c_friends, c_enemies] = piece.checkCollision(false, true, extra_offset);
					if (c_enemies.length)
						preferred_pieces_that_can_move[1] = piece;
					else if (SAFE_PATH.includes(piece._pos + extra_offset))
						preferred_pieces_that_can_move[3] = piece;
					else if (!piece.isSafe())
						preferred_pieces_that_can_move[4] = piece;
				}
				pieces_that_can_move.push(piece);
				pieces_that_can_move_positions.push(piece._pos);
			}
		});

		if (pieces_that_can_move.length === 1) {
			pieces_that_can_move[0].move();
		} else if (pieces_that_can_move.length > 1) {
			let t;
			if (this._game._isLocal && this._game._localBots.includes(this._seq_id))
				t = 700;
			else
				t = 15*1000;
			let piece_to_move = preferred_pieces_that_can_move[1] || preferred_pieces_that_can_move[2] || preferred_pieces_that_can_move[3] || preferred_pieces_that_can_move[4] || pieces_that_can_move[Math.floor(Math.random() * pieces_that_can_move.length)];
			this.setTimer(t, function() {
				piece_to_move.move();
			});
		} else if (this._game._board._Dice._value === 6) {
			this._game._board._Dice.setInteractive(true);
		} else if (this._game._isLocal) {
			this._game.NextPlayerTurn();
			this._game.onServerUpdate({players_data: {}, playing: true, player_turn: this._game.player_turn});
		}
	}
	markMyPieces_as_ineligible() {
		Object.values(this.Pieces).forEach(function(piece) {
			piece.mark_as_ineligible();
		});
	}
	BringMyPiecesUpFront() {
		for (let [player_seq_id, player] of Object.entries(this._game.Players)) {
			if (parseInt(player_seq_id) === this._seq_id) {
				Object.values(player.Pieces).forEach(function(piece) {
					piece.zIndex = 1000;
				}, this);
			} else {
				Object.values(player.Pieces).forEach(function(piece) {
					piece.zIndex = 10;
				}, this);
			}
		}
		if (this._game._board.parent)
			this._game._board.updateTransform();
	}
	setTimer(duration, action) {
		this.Timer = setTimeout(action, duration);
	}
	clearTimer() {
		clearTimeout(this.Timer);
	}
}
class Game_Player_Piece extends PIXI.Sprite {
	constructor(player, seq_id) {
		super(PIXI.Loader.shared.resources.piece.textures['piece_1']);
		this._player = player;
		this._seq_id = seq_id;
		this._pos = 0;
		this.zIndex = 10;

		this.anchor.set(0.5);
		this.custom_scale(0.7);

		this.timeline = gsap.timeline();

		var color;
		switch(this._player._seq_id) {
			case 1:
				this._home = this._player._game._board._BoardHomeRed;
				this._room = this._home._room[seq_id-1]; // room array starts with 0
				this._path = [this._room, ...this._player._game._board._Path_RED];
				color = RED;
				break;
			case 2:
				this._home = this._player._game._board._BoardHomeGreen;
				this._room = this._home._room[seq_id-1]; // room array starts with 0
				this._path = [this._room, ...this._player._game._board._Path_GREEN];
				color = GREEN;
				break;
			case 3:
				this._home = this._player._game._board._BoardHomeYellow;
				this._room = this._home._room[seq_id-1]; // room array starts with 0
				this._path = [this._room, ...this._player._game._board._Path_YELLOW];
				color = YELLOW;
				break;
			case 4:
				this._home = this._player._game._board._BoardHomeBlue;
				this._room = this._home._room[seq_id-1]; // room array starts with 0
				this._path = [this._room, ...this._player._game._board._Path_BLUE];
				color = BLUE;
				break;
		}

		this.tint = color;

		this.buttonMode = true;
		this.interactive = false;
		this.send_home();
		this.on('pointerdown', function() {
			if (this._pos === 1 || this._pos === 53) {
				var [c_friends, c_enemies] = this.checkCollision(true, false);
				let piece_at_1 = null;
				let piece_at_53 = null;
				c_friends.forEach(function(piece) {
					if (this._pos === 1 && piece._pos === 53) {
						piece_at_1 = this;
						piece_at_53 = piece;
					} else if (this._pos === 53 && piece._pos === 1) {
						piece_at_1 = piece;
						piece_at_53 = this;
					}
				}, this);
				if (piece_at_1 && piece_at_53) {
					Swal.fire({
					  title: 'Move the piece at position 1 ?',
					  icon: 'question',
					  allowOutsideClick: false,
					  allowEscapeKey: false,
					  showCancelButton: true,
					  confirmButtonText: 'Yes, Pos 1',
					  cancelButtonText: 'No, Pos 53',
					  confirmButtonColor: '#d33',
					}).then((result) => {
						if (result.value) {
							piece_at_1.move();
						} else {
							piece_at_53.move();
						}
					});
				} else {
					this.move();
				}
			} else {
				this.move();
			}
		}.bind(this));

		this._player._game._board.addChild(this);
	}
	custom_scale(s) {
		this.scale.set((s*this._player._game._board._BoxSize)/64);
	}

	isSafe() {
		return SAFE_PATH.includes(this._pos);
	}
	canMove() {
		let steps = this._player._game._board._Dice._value;
		if ((this._pos + steps > this._path.length - 1) || (this._pos === 0 && steps != 6)) {
			return false;
		}
		return true;
	}

	send_home() {
		this._pos = 0;
		this.timeline.to(this, 0.05, this._path[0], '>');
	}
	make_first_step() {
		if (this._pos != 1)
			this._pos = 1;
		this.timeline.to(this, 0.05, this._path[1], '>');
	}

	check() {
		if (this.canMove()) {
			if (!(this._player._game._isLocal && this._player._game._localBots.includes(this._player._game.my_seq_id)))
				this.mark_as_eligible();
			return true;
		}
		return false;
	}
	mark_as_eligible() {
		this.interactive = true;
		var [c_friends, c_enemies] = this.checkCollision(true, false);
		this.texture = PIXI.Loader.shared.resources.piece.textures['piece_active_'+(c_friends.length+1)];
	}
	mark_as_ineligible() {
		this.interactive = false;
		var [c_friends, c_enemies] = this.checkCollision(true, false);
		this.texture = PIXI.Loader.shared.resources.piece.textures['piece_'+(c_friends.length+1)];
	}

	move() {
		this._player.clearTimer();

		let dice = this._player._game._board._Dice;
		let steps = dice._value;
		let old_pos = this._pos;
		if (old_pos === 0) {
			this._pos = 1;
		} else {
			this._pos = old_pos + steps;
		}

		var [c_friends, c_enemies] = this.checkCollision(false, true);

		this._player.markMyPieces_as_ineligible();
		this._player._game.UpdateGame({
			action: 'move',
			data: {
				player: this._player._seq_id,
				piece: this._seq_id,
				old_pos: old_pos,
				new_pos: this._pos,
			},
		});

		if (this._pos === 1) {
			this.make_first_step();
			PIXI.Loader.shared.resources.first_step.sound.play();
			this._player.updatePercentage();

			dice.setInteractive(true);
		} else {
			for (var i = 1; i <= steps; i++) {
				setTimeout(() => {
					PIXI.Loader.shared.resources.move.sound.play();
				}, 0.07*(i-1)*1000);
				this.timeline.to(this, 0.07, this._path[old_pos+i], '>');
			}

			setTimeout(() => {
				if (this._pos === 59) {
					PIXI.Loader.shared.resources.victory.sound.play();
				} else if (c_enemies.length) {
					c_enemies.forEach(function(piece) {
						piece.send_home();
						piece.mark_as_ineligible();
						piece._player.updatePercentage();
						PIXI.Loader.shared.resources.eat.sound.play();
					});
				}

				this._player.updatePercentage();

				if ((steps === 6 || c_enemies.length) && this._player.percentage != 100) {
					dice.setInteractive(true);
				} else {
					if (this._player._game._isLocal) {
						this._player._game.NextPlayerTurn();
						this._player._game.onServerUpdate({players_data: {}, playing: true, player_turn: this._player._game.player_turn});
					}
					this._player._game.setReady();
				}
			}, 0.07*steps*1000);
		}
	}
	move_alt(old_pos, new_pos) {
		if (this._pos != old_pos)
			return;

		this._pos = new_pos;

		var [c_friends, c_enemies] = this.checkCollision(false, true);

		this._player.markMyPieces_as_ineligible();

		if (this._pos === 1) {
			this.make_first_step();
			PIXI.Loader.shared.resources.first_step.sound.play();
			this._player.updatePercentage();

			this._player._game.setReady();
		} else {
			let steps = new_pos - old_pos;
			for (var i = 1; i <= steps; i++) {
				setTimeout(() => {
					PIXI.Loader.shared.resources.move.sound.play();
				}, 0.07*(i-1)*1000);
				this.timeline.to(this, 0.07, this._path[old_pos+i], '>');
			}

			setTimeout(() => {
				if (this._pos === 59) {
					PIXI.Loader.shared.resources.victory.sound.play();
				} else if (c_enemies.length) {
					c_enemies.forEach(function(piece) {
						piece.send_home();
						piece.mark_as_ineligible();
						piece._player.updatePercentage();
						PIXI.Loader.shared.resources.eat.sound.play();
					});
				}

				this._player.updatePercentage();

				this._player._game.setReady();
			}, 0.07*steps*1000);
		}
	}

	checkCollision(friends, enemies, extra_offset) {
		let c_friends = [];
		let c_enemies = [];
		extra_offset = extra_offset || 0;
		
		for (let [player_seq_id, player] of Object.entries(this._player._game.Players)) {
			if (parseInt(player_seq_id) === this._player._seq_id) {
				if (friends) {
					// check for c_friends
					Object.values(player.Pieces).forEach(function(piece) {
						if (piece._pos != 0 && piece._seq_id != this._seq_id) {
							if (piece._pos === this._pos || (piece._pos === 1 && this._pos === 53) || (piece._pos === 53 && this._pos === 1))
								c_friends.push(piece);
						}
					}, this);
				}
			} else {
				if (enemies) {
					// check for c_enemies
					Object.values(player.Pieces).forEach(function(piece) {
						if (!piece.isSafe()) {
							let offset = parseInt(player_seq_id) - this._player._seq_id;
							if (offset > 0) {
								if (piece._pos <= (4-offset)*13)
									offset = -offset*13;
								else
									offset = (4-offset)*13;
							} else {
								if (piece._pos <= -offset*13)
									offset = -(4+offset)*13;
								else
									offset = -offset*13;
							}
							if (piece._pos - offset === this._pos + extra_offset) {
								c_enemies.push(piece);
							}
						}
					}, this);
				}
			}
		}

		return [c_friends, c_enemies];
	}
}

class Game_Spinner {
	constructor() {
		this.dom = document.createElement("div");
		this.dom.setAttribute('class', 'lds-dual-ring');
		this.dom.style.display = 'none';
		document.body.appendChild(this.dom);
	}
	show() {
		this.dom.style.display = 'block';
	}
	hide() {
		this.dom.style.display = 'none';
	}
	destroy() {
		document.body.removeChild(this.dom);
	}
}

function round(p) {
	return (Math.round(parseFloat(p)*100)/100);
}
function distanceBetweenTwoPoints(p1, p2) {
	const a = p1.x - p2.x;
	const b = p1.y - p2.y;

	return Math.hypot(a, b);
}
function random_number() {
	return 100000 + Math.floor(Math.random() * 900000);
}
function copyTextToClipboard(text) {
	var textArea = document.createElement("textarea");
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;
	textArea.style.width = '2em';
	textArea.style.height = '2em';
	textArea.style.padding = 0;
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';
	textArea.style.background = 'transparent';
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	document.execCommand('copy');
	document.body.removeChild(textArea);
}
