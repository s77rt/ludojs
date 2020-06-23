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
const BACKGROUND = 0x131836;
const TEXT = 0xddffff;

const COLOR_MAP = {
	0: 0xffffff,
	1: RED,
	2: GREEN,
	3: YELLOW,
	4: BLUE,
}

const SAFE_PATH = [0, 1, 14, 27, 40, 53, 54, 55, 56, 57, 58, 59];

class Game {
	constructor() {
		this.my_seq_id = 0; // 0 is for local
		this.player_turn = null;
		this.busy = false; // for smooth updaes
		this.funqueue = []; // functions queue

		this.brand = document.getElementById('brand');
		this.spinner = new Game_Spinner();

		this.token = '';

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

	AutoServer() {
		this.spinner.show();
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		this._socket.emit('AutoServer', this._mainmenu._playername.text);
	}
	JoinServer(id) {
		this.spinner.show();
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		this._socket.emit('JoinServer', id, this._mainmenu._playername.text);
	}
	HostServer(isPrivate) {
		this.spinner.show();
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		isPrivate = (isPrivate === true) ? true : false;
		this._socket.emit('HostServer', isPrivate, this._mainmenu._playername.text);
	}
	LeaveServer() {
		this.player_turn = null;
		this._control._play.texture = PIXI.Loader.shared.resources.icons.textures['play'];
		this._socket.emit('LeaveServer');
	}

	StartGame() {
		this.spinner.show();
		this._socket.emit('StartGame');
	}
	UpdateGame(action) {
		this._socket.emit('UpdateGame', action);
	}

	Message(msg) {
		this._socket.emit('Message', msg);
	}

	onOnlinePlayers(n) {
		this._onlineplayers.text = 'Online Players: '+n;
	}

	onJoinServer(data) {
		this.spinner.hide();
		console.log("JoinServer", data);
		this.my_seq_id = data.seq_id;
		this.loadBoard(data.isPrivate);
		this._chat.addMessage("You are a guest", 0);
	}
	onHostServer(data) {
		this.spinner.hide();
		console.log("HostServer", data);
		this.my_seq_id = data.seq_id;
		this.loadBoard(data.isPrivate);
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
		this.my_seq_id = 0;
		console.log("LeaveServer", bool);
	}

	onServerUpdate(data) {
		this.spinner.hide();
		console.log("ServerUpdate", data);
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
			if (this.player_turn === this.my_seq_id) {
				dice.interactive = true;
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

				this._chat.addMessage("Your turn now", 0);
			} else if (this.player_turn === -1) {
				setTimeout(() => {
					this._chat.addMessage("Game Over", 0);
					PIXI.Loader.shared.resources.game_over.sound.play();
					dice.changeColor(0x000000);
				}, (0.07*6*1000 * 2)); // just to be sure that the last steps are made
			} else {
				this._chat.addMessage("Waiting for "+data.players_data[data.player_turn].name, 0);
			}
			dice.changeColor(COLOR_MAP[this.player_turn]);
			this.Players[this.player_turn].BringMyPiecesUpFront();
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
		console.log("Server error", error);
	}

	onGameUpdate(action) {
		console.log("GameUpdate", action);
		let data = action.data;
		switch(action.action) {
			case "roll":
				this._board._Dice._rotationdirection = data.rotationdirection;
				this._board._Dice._power = data.power;
				this._board._Dice._acceleration = data.acceleration;
				this._board._Dice.roll(action.data.number, false);
				break;
			case "move":
				this.Players[data.player].Pieces[data.piece].move_alt(data.old_pos, data.new_pos);
				break;
		}
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
			backgroundColor: BACKGROUND,
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
		loader.add('backgrounds', '/static/resources/images/backgrounds.json')
			  .add('icons', '/static/resources/images/icons.json')
			  .add('piece', '/static/resources/images/piece.json')
			  .add('dice', '/static/resources/images/dice.json')
			  .add('logo', '/static/resources/images/logo.png')
			  .add('flame', '/static/resources/images/flame.png')
			  .add('game_started', '/static/resources/sounds/game_started.wav')
			  .add('game_over', '/static/resources/sounds/game_over.wav')
			  .add('notification', '/static/resources/sounds/notification.wav')
			  .add('move', '/static/resources/sounds/move.wav')
			  .add('victory', '/static/resources/sounds/victory.wav')
			  .add('winner', '/static/resources/sounds/winner.wav')
			  .add('roll_dice', '/static/resources/sounds/roll_dice.wav')
			  .add('rolled_dice', '/static/resources/sounds/rolled_dice.wav')
			  .add('first_step', '/static/resources/sounds/first_step.wav')
			  .add('eat', '/static/resources/sounds/eat.wav');
		loader.load();
		loader.onProgress.add((e) => {loader_progress.text = 'Loading '+Math.floor(e.progress)+'%'});
		loader.onComplete.add(() => {this._startApp()});
	}
	_startApp() {
		this._bg1 = new PIXI.Sprite(PIXI.Loader.shared.resources.backgrounds.textures.bg1, this._app.screen.width, this._app.screen.height);
		this._bg1.scale.set(this._app.screen.width/1920, this._app.screen.height/1080);

		this._bg2 = new PIXI.Sprite(PIXI.Loader.shared.resources.backgrounds.textures.bg2, this._app.screen.width, this._app.screen.height);
		this._bg2.scale.set(this._app.screen.width/1920, this._app.screen.height/1080);

		this._onlineplayers = new PIXI.Text('', {fontFamily : 'Lato', fontSize: this._uSize/40, fill : TEXT, align : 'center'});
		this._onlineplayers.x = 10;
		this._onlineplayers.y = this._app.screen.height - (this._onlineplayers.height + 10);

		this._info = new PIXI.Text('v0.1.0', {fontFamily : 'Lato', fontSize: this._uSize/40, fill : TEXT, align : 'center'});
		this._info.x = this._app.screen.width - (this._info.width + 10);
		this._info.y = this._app.screen.height - (this._info.height + 10);

		this._mainmenu = new Game_MainMenu(this);
		this._board = new Game_Board(this);
		this._control = new Game_Control(this);
		this._chat = new Game_Chat(this);

		this.Players = {
			1: new Game_Player(this, 1),
			2: new Game_Player(this, 2),
			3: new Game_Player(this, 3),
			4: new Game_Player(this, 4)
		}
		this._isPrivate = false;

		this.loadMainMenu();
	}
	loadMainMenu() {
		this._chat.hide();
		this._chat.reset();
		this._app.stage.removeChildren();
		this._mainmenu.interactiveChildren = true;
		this._app.stage.addChild(this._bg1, this._onlineplayers, this._info, this._mainmenu);
		this.OnlinePlayers();
		this.brand.style.display = "block";
	}
	loadBoard(isPrivate) {
		this.brand.style.display = "none";
		this._app.stage.removeChildren();
		this._isPrivate = isPrivate;
		this._board.reset();
		this._app.stage.addChild(this._bg2, this._control, this._board);
		this._chat.reset();
		this._chat.show();
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
			msg = msg.replace(/^You /, '<span style="color: #'+COLOR_MAP[this._game.my_seq_id].toString(16).padStart(6, '0')+'">You </span>');
		} else {
			person = this._game.Players[source].name;
		}
		person = person.replace(/[^\w]/gi, '').trim().substring(0, 15);
		this._box.innerHTML += '<span style="color: #'+color+'">'+person+':</span> '+msg+'<br>';
		this._box.scrollTop = this._box.scrollHeight;
	}
}

class Game_Control extends PIXI.Container {
	constructor(game) {
		super();
		this._game = game;

		this._gohome = new Game_Control_Button(this, "exit", function() {
			Swal.fire({
			  title: 'Are you sure you want to quit?',
			  icon: 'question',
			  showCancelButton: true,
			  confirmButtonText: 'Yes, Leave',
			  cancelButtonText: 'No, Stay',
			  confirmButtonColor: '#d33',
			}).then((result) => {
				if (result.value) {
					this.LeaveServer();
					this.loadMainMenu();
				}
			});
		}.bind(game));
		this._gohome.x = this._game._board._BoxSize/2;
		this._gohome.y = this._game._board._BoxSize/2;
		this.addChild(this._gohome);

		this._play = new Game_Control_Button(this, "play", function() {
			if (this._game.player_turn) {
				Swal.fire(
				  'Not allowed',
				  'The current match cannot be paused',
				  'error'
				)
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
					console.log(msg);
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
			this.tint = 0xfff500;
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
		this._logo.x = this._logo.width/4;
		this.addChild(this._logo);

		this.addPlayerInput("Your name...", localStorage.getItem('playername') || "Player"+random_number());

		this._numberOfButtons = 0;

		this.addButton("Play Online", this._game.AutoServer.bind(this._game));
		this.addButton("Play Private (HOST)", function() {
			this.HostServer(true);
		}.bind(this._game));
		this.addButton("Play Private (JOIN)", async function() {
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

		this.scale.y = 0.8*(this._game._app.screen.height/this.height);
		this.scale.x = 0.9*this.scale.y
		this.x = (this._game._app.screen.width / 2) - (this.width / 2);
		this.y = (this._game._app.screen.height / 2) - (this.height / 2);
	}
	addPlayerInput(placeholder, default_text) {
		this._playername = new Game_Input(this, placeholder, default_text);
		this._playername.y = this._logo.y+this._logo.height+this._playername.height+40;
		this._playername.on('input', text => {
			this._playername.text = text.replace(/[^\w]/gi, '').trim().substring(0, 15);
			localStorage.setItem('playername', this._playername.text);
		});
		this.addChild(this._playername);
	}
	addButton(text, action) {
		let button = new Game_MainMenu_Button(this, text, action);
		button.y = 1.75*this._playername.height+this._playername.y + (1.25*50 * this._numberOfButtons);
		this._numberOfButtons++;
		this.addChild(button);
	}
}
class Game_MainMenu_Button extends PIXI.Container {
	constructor(mainmenu, text, action) {
		super();
		this._mainmenu = mainmenu;

		this._buttonText = new PIXI.Text(text, {fontFamily : 'Lato', fontSize: 26, fill : TEXT, align : 'center'});
		this._buttonText.cacheAsBitmap = true;

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
			this._buttonFrame.alpha = 0.5;
			this._mainmenu._playername.blur();
			this._mainmenu.interactiveChildren = false;
			this._action();
		});

		this.addChild(this._buttonFrame, this._buttonText);
	}
}
class Game_Input extends PIXI.TextInput {
	constructor(game, placeholder, default_text) {
		super({
			input: {
				fontSize: '20px',
				textAlign: 'center',
				padding: '10px',
				width: '270px',
				color: '#dcdcdc'
			},
			box: {
				default: {fill: 0x111111, rounded: 0, stroke: {color: 0xffffff, width: 1}},
				focused: {fill: 0x111111, rounded: 0, stroke: {color: 0xdddddd, width: 1}},
				disabled: {fill: 0xDBDBDB, rounded: 0}
			}
		});
		this._game = game;
		
		this.placeholder = placeholder;
		this.text = default_text;
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
		this._BoardGraphics.lineStyle(this._BoxSize/2, 0x333333);
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
		this._Dice.interactive = false;
		this._Dice.changeColor(0xffffff);
		this._Dice.texture = this._Dice.textures[0];
		Object.values(this._game.Players).forEach(function(player) {
			player.clearInfo();
			Object.values(player.Pieces).forEach(function(piece) {
				piece.send_home();
				piece.mark_as_ineligible();
			})
		})
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
	roll(x, my_turn) {
		this.interactive = false;
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
				this._board._game.Players[this._board._game.player_turn].checkMyPieces();
			this._board._game.setReady();
		}, 1.1*1000);
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
			this.roll(Math.floor(this._board._game.token() * 6) + 1, true);
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
			PIXI.Loader.shared.resources.winner.sound.play();
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
		let pieces_that_can_move_positions = [];
		let a_piece_that_can_move = null;
		Object.values(this.Pieces).forEach(function(piece) {
			let p_c = piece.check();
			if (p_c && (piece._pos === 0 || !pieces_that_can_move_positions.includes(piece._pos))) {
				pieces_that_can_move_positions.push(piece._pos);
				a_piece_that_can_move = piece;
			}
		});
		if (pieces_that_can_move_positions.length === 1)
			a_piece_that_can_move.move();
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
		this._game._board.updateTransform();
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
		this.position.copyFrom(this._room);
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
		this.position.copyFrom(this._room);
	}

	check() {
		if (this.canMove()) {
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
			this.position.copyFrom(this._path[this._pos]);
			PIXI.Loader.shared.resources.first_step.sound.play();
			this._player.updatePercentage();

			dice.interactive = true;
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
						PIXI.Loader.shared.resources.eat.sound.play();
					});
				}

				this._player.updatePercentage();

				if ((steps === 6 || c_enemies.length) && this._player.percentage != 100)
					dice.interactive = true;
				else
					this._player._game.setReady();
			}, 0.07*steps*1000);
		}
	}
	move_alt(old_pos, new_pos) {
		if (this._pos != old_pos)
			return;

		this._pos = new_pos;

		var [c_friends, c_enemies] = this.checkCollision(false, true);

		if (this._pos === 1) {
			this.position.copyFrom(this._path[this._pos]);
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
						PIXI.Loader.shared.resources.eat.sound.play();
					});
				}

				this._player.updatePercentage();

				this._player._game.setReady();
			}, 0.07*steps*1000);
		}
	}

	checkCollision(friends, enemies) {
		let c_friends = [];
		let c_enemies = [];
		
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
						if (!SAFE_PATH.includes(piece._pos)) {
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
							if (piece._pos - offset === this._pos) {
								console.log(piece);
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
