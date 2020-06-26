/*
	Modules that we need
*/

const config = require('./config.js');
const io_client = require('socket.io-client');
var seedrandom = require('seedrandom');

/*
	Initialize
*/

const NAMES = [
	'Marinda', 'Antonina', 'Clotilde', 'Zack', 'Guy', 'Lashawn', 'Brandy', 'Lorriane', 'Theola', 'Monte', 'Tomas', 'Hildegarde', 'Chance', 'Ronald', 'Aleta', 'Domenic', 'Bea', 'Sharika', 'Gerard', 'Lessie', 'Tona', 'Gertha', 'Zoe', 'Bradley', 'Larita', 'Carroll', 'Muoi', 'Lala', 'Omer', 'Gia',
	'Ardith', 'Pasquale', 'Jacklyn', 'Seth', 'Alexa', 'Alex', 'Margarette', 'Zena', 'Nina', 'Jutta', 'Golden', 'Wanetta', 'Oliva', 'Ahmad', 'Velia', 'Herb', 'Kayce', 'Evelina', 'Loris', 'Danae', 'Dusti', 'Lawrence', 'Wenona', 'Camellia', 'Claretta', 'Breann', 'Hiram', 'Richard', 'Sharita', 'Adria',
	'Rufus', 'Elden', 'Ryan', 'Natalie', 'Rolande', 'Lee', 'Georgina', 'Tiffani', 'Eilene', 'Iluminada', 'Shonta', 'Darrel', 'Lakeisha', 'Loan', 'Eloise', 'Simona', 'Mathew', 'Reiko', 'Verda', 'Glenda', 'Jefferson', 'Kimberlee', 'Rocky', 'Dania', 'Loma', 'Nannette', 'Victorina', 'Karina', 'Silvia', 'Thuy',
	'Bonnie', 'Keena', 'Fallon', 'Pat', 'Denese', 'Nichole', 'June', 'Deloise', 'Ernest', 'Deon', 'Lurline', 'Sherman', 'Daria', 'Stephen', 'Dottie', 'Alishia', 'Leisha', 'Janyce', 'Taisha', 'Dominica', 'Alejandrina', 'Nakesha', 'Claudette', 'Alexa', 'Alpha', 'Rebbeca', 'Kacey', 'Pamula', 'Georgeann', 'Genia',
	'Delmar', 'Keely', 'Tandra', 'Brenna', 'Gary', 'Janeth', 'Jeane', 'Aleshia', 'Enriqueta', 'Deja', 'Corey', 'Martha', 'Lyndsey', 'Agripina', 'Jaye', 'Rosita', 'Deidre', 'Hortencia', 'Marcus', 'Kendal', 'Allison', 'Jerold', 'Suzie', 'Carmelita', 'Marcie', 'Fermina', 'Cristi', 'Andree', 'Sook', 'Jennette',
	'Felisha', 'So', 'Pok', 'Young', 'Athena', 'Ines', 'Bailey', 'Carolynn', 'Kanesha', 'Meda', 'Mina', 'Brady', 'Donnetta', 'Sharda', 'Nadene', 'Diego', 'Williams', 'Crysta', 'Leisa', 'Cathrine', 'Latosha', 'Song', 'Sheba', 'Tish', 'Hermila', 'Darlena', 'Ayako', 'Francisco', 'Harland', 'Jana',
	'Glynis', 'Ailene', 'Juliane', 'Lloyd', 'Caryn', 'Tanika', 'Carly', 'Ute', 'Violeta', 'Ladonna', 'Darlena', 'Aurore', 'Laveta', 'Allyson', 'Debroah', 'Larraine', 'Latashia', 'Isis', 'Meghann', 'Jere', 'Luisa', 'Earnestine', 'Alda', 'Charles', 'Salley', 'Berry', 'Ferne', 'Alyce', 'Maryann', 'Herta',
	'Brunilda', 'Lucilla', 'Alline', 'Sue', 'Trudi', 'Loan', 'Alan', 'Julianna', 'Sherley', 'Dia', 'Ayanna', 'Ada', 'Derick', 'Shavonne', 'Elenor', 'Josiah', 'Willy', 'Malcom', 'Deidra', 'Loria', 'Christie', 'Loris', 'Zoraida', 'Bruno', 'Gala', 'Elfriede', 'Wilfredo', 'Exie', 'Shelia', 'Ezekiel',
	'Kelley', 'Bennett', 'Herbert', 'Mozella', 'Earle', 'Claretta', 'Janeen', 'Florentina', 'Lorilee', 'Reatha', 'Jake', 'Gabriela', 'Pamelia', 'Lakenya', 'Dayle', 'Tanner', 'Vannessa', 'Arvilla', 'Neomi', 'Mel', 'Tameika', 'Barabara', 'Richie', 'Talitha', 'Nick', 'Darrick', 'Tina', 'Krysten', 'Teressa', 'Idella',
	'Roselyn', 'Milford', 'Isidro', 'Nick', 'Jenni', 'Tawanda', 'Angele', 'Fernanda', 'Lesley', 'Fairy', 'Cherri', 'Blair', 'Brain', 'Tonja', 'Pam', 'Linette', 'Trudy', 'Piedad', 'Dara', 'China', 'Sherell', 'Dionne', 'Tasia', 'Bradly', 'Fredericka', 'Ronny', 'Merlene', 'Dirk', 'Kylie', 'Alfreda'
];

const SAFE_PATH = [0, 1, 14, 27, 40, 53, 54, 55, 56, 57, 58, 59];

/*
	Logic
*/

class Bot {
	constructor() {
		this.my_seq_id = 1; // 1 is for just for fallback

		this.funqueue = [];

		this.token = Math.random;

		this._socket = io_client('http://127.0.0.1:'+config.Port);

		this._socket.on('JoinServer', this.onJoinServer.bind(this));

		this._socket.on('ServerUpdate', this.onServerUpdate.bind(this));
		this._socket.on('ServerError', this.onServerError.bind(this));
	}

	process_funqueue() {
		if (this.funqueue.length > 0) {
			(this.funqueue.shift())();
		}
	}

	JoinServer(server_id) {
		this._socket.emit('JoinServer', server_id, getRandomName());
	}
	LeaveServer() {
		this._socket.emit('LeaveServer');
	}

	UpdateGame(action) {
		if (this._socket)
			this._socket.emit('UpdateGame', action);
	}
	UpdateGameLazy(action, delay) {
		this.funqueue.push(function() {this.UpdateGame(action)}.bind(this));
		setTimeout(() => {
			this.process_funqueue();
		}, delay+(this.funqueue.length*300));
	}

	onJoinServer(data) {
		this.my_seq_id = data.seq_id;
	}

	onServerUpdate(data) {
		if (data.players === 1 || data.player_turn === -1) {
			if (this._socket) {
				this.LeaveServer();
				this._socket.disconnect();
				this._socket = null;
				delete this._socket;
			}
		} else if (data.playing && data.player_turn === this.my_seq_id) {
			var self = data.players_data[this.my_seq_id];
			this.token = seedrandom(data.token);
			var delay = 0;
			while (true) {
				delay += 1100;
				// Bot turn, let's roll the dice
				var dice_value = Math.floor(this.token() * 6) + 1;
				this.UpdateGameLazy({
					action: 'roll',
					data: {
						number: dice_value,
						rotationdirection: Math.random() < 0.5 ? -1 : 1,
						power: Math.floor((Math.random() * 4) + 1),
						acceleration: {x: (Math.random() < 0.5 ? -1 : 1)*(Math.floor((Math.random() * 100) + 1)), y: (Math.random() < 0.5 ? -1 : 1)*(Math.floor((Math.random() * 100) + 1))},
					},
				}, delay);
				// Check if i have pieces that i can move
				let c_enemies = 0;
				let pieces_that_can_move = [];
				let pieces_that_can_move_positions = [];
				let preferred_pieces_that_can_move = {1: null, 2: null, 3: null, 4: null};
				for (let [piece_seq_id, piece] of Object.entries(self.pieces)) {
					let CanMove = !((piece + dice_value > 60 - 1) || (piece === 0 && dice_value != 6));
					if (CanMove && !pieces_that_can_move_positions.includes(piece)) {
						if (piece === 0) {
							preferred_pieces_that_can_move[2] = {seq_id: piece_seq_id, old_pos: 0, new_pos: 1};
							pieces_that_can_move.push({seq_id: piece_seq_id, old_pos: 0, new_pos: 1});
							pieces_that_can_move_positions.push(0);
						} else {
							c_enemies = checkCollision(data, this.my_seq_id, piece, dice_value)
							if (c_enemies > 0) {
								preferred_pieces_that_can_move[1] = {seq_id: piece_seq_id, old_pos: piece, new_pos: piece+dice_value};
								pieces_that_can_move.push({seq_id: piece_seq_id, old_pos: piece, new_pos: piece+dice_value});
								pieces_that_can_move_positions.push(piece);
								break; // Very very important, to stop updating the data variable
							} else {
								if (SAFE_PATH.includes(piece + dice_value))
									preferred_pieces_that_can_move[3] = {seq_id: piece_seq_id, old_pos: piece, new_pos: piece+dice_value};
								else if (!SAFE_PATH.includes(piece))
									preferred_pieces_that_can_move[4] = {seq_id: piece_seq_id, old_pos: piece, new_pos: piece+dice_value};
								pieces_that_can_move.push({seq_id: piece_seq_id, old_pos: piece, new_pos: piece+dice_value});
								pieces_that_can_move_positions.push(piece);
							}
						}
					}
				}
				if (pieces_that_can_move.length) {
					delay += (pieces_that_can_move.length === 1) ? 10 : 1500;
					let piece_to_move = preferred_pieces_that_can_move[1] || preferred_pieces_that_can_move[2] || preferred_pieces_that_can_move[3] || preferred_pieces_that_can_move[4] || pieces_that_can_move[Math.floor(Math.random() * pieces_that_can_move.length)];
					self.pieces[piece_to_move.seq_id] = piece_to_move.new_pos;
					this.UpdateGameLazy({
						action: 'move',
						data: {
							player: this.my_seq_id,
							piece: piece_to_move.seq_id,
							old_pos: piece_to_move.old_pos,
							new_pos: piece_to_move.new_pos,
						},
					}, delay);
					// Update my percentage
					var totalPos = 0;
					Object.values(self.pieces).forEach(function(piece) {
						totalPos += piece;
					});
					self.percentage = Math.floor(100*((totalPos / 4) / 59));
				}
				// Check if i should play again
				if ((dice_value != 6 && c_enemies === 0) || data.players_data[this.my_seq_id].percentage === 100)
					break;
			}
		}
	}
	onServerError() {
		if (this._socket) {
			this.LeaveServer();
			this._socket.disconnect();
			this._socket = null;
			delete this._socket;
		}
	}
}

/*
	Helpers
*/

function getRandomName() {
	return NAMES[Math.floor(Math.random() * NAMES.length)];
}

function checkCollision(data, my_seq_id, my_piece_pos, extra_offset) {
	/*
	DO NOT call this function multiple times without being extremely careful, as this edits the data variable;
	You should stop calling the function once you get a positive value (except if you are using a new data variable)

	Here is an example if you don't stop this functions:
	let's say the bot has two pieces at positions 0 and 14, and ahead of each piece there is a victim at a distance of 3 steps
	if you call this function twice, both of the victim's pieces will be sent home, but you will only be able to kill one
	so in the next turn if you happen to get another 3 steps value, you will see that the data variable have marked the second piece of the victim at pos 0 (due to the previous calls)
	while in fact it's still playing on board...

	so what i mean here is, checkCollision not only check for collisions, but also send those enemies pieces to home.
	=> Call the function once, if c_enemies returned > 0, play the current my_piece_pos and stop calling this function, that's the way to keep everything in sync
	=> If this returned a zero value, you can call it again (the zero value also means that the data variable has not been changed)
	=> You can call this function twice only if the second call argument data is independent of the first one (not used here and not planning to, so you can ignore this)
	*/
	let c_enemies = 0;
	extra_offset = extra_offset || 0;
	
	for (let [player_seq_id, player] of Object.entries(data.players_data)) {
		if (parseInt(player_seq_id) != my_seq_id) {
			// check for c_enemies
			for (let [piece_seq_id, piece] of Object.entries(player.pieces)) {
				if (!SAFE_PATH.includes(piece)) {
					let offset = parseInt(player_seq_id) - my_seq_id;
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
					if (piece - offset === my_piece_pos + extra_offset) {
						data.players_data[player_seq_id].pieces[piece_seq_id] = 0;
						c_enemies++;
					}
				}
			}
		}
	}

	return c_enemies;
}

/*
	Show Time :)
*/

exports = module.exports = function(server_id) {
	new Bot().JoinServer(server_id);
}
