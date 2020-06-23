// Colors
const RED = 0xff7979;
const GREEN = 0x26de81;
const YELLOW = 0xfed330;
const BLUE = 0x4990e2;
const BORDER = 0x272727;
const BOARD = 0xddffff;
const BACKGRDOUND = 0x2f3542;

function testForAABB(object1, object2) {
	const bounds1 = object1.getBounds();
	const bounds2 = object2.getBounds();

	return bounds1.x < bounds2.x + bounds2.width
		&& bounds1.x + bounds2.width > bounds2.x
		&& bounds1.y < bounds2.y + bounds2.height
		&& bounds1.y + bounds2.height > bounds2.y;
}

const Offsets = {
	[RED]: {[RED]: 0, [GREEN]: 13, [YELLOW]: 26, [BLUE]: 39},
	[GREEN]: {[RED]: 39, [GREEN]: 0, [YELLOW]: 13, [BLUE]: 26},
	[YELLOW]: {[RED]: 26, [GREEN]: 39, [YELLOW]: 0, [BLUE]: 13},
	[BLUE]: {[RED]: 13, [GREEN]: 26, [YELLOW]: 39, [BLUE]: 0},
};

function getPosOffset(piece1, piece2) {
	var pos_offset;
	let offset = Offsets[piece1.color][piece2.color];
	let pos = piece1.pos;
	switch(offset) {
		case 0:
			pos_offset = 0;
			break;
		case 13:
			pos_offset = pos < 13 ? 39 : -13;
			break;
		case 26:
			pos_offset = pos < 26 ? 26 : -26;
			break;
		case 39:
			pos_offset = pos < 39 ? 13 : -39;
			break;
	}
	return pos_offset;
}

function testForCollision(piece1, piece2) {
	let pos_offset = getPosOffset(piece1, piece2);
	return (piece1.pos === piece2.pos - pos_offset);
}

function roundPixel(p) {
	return (Math.round(parseFloat(p)*100)/100);
}

function equal(a, b) {
	return roundPixel(a) === roundPixel(b);
}

function distanceBetweenTwoPoints(p1, p2) {
	const a = p1.x - p2.x;
	const b = p1.y - p2.y;

	return Math.hypot(a, b);
}

// Create our application instance
var app = new PIXI.Application({
	resizeTo: window,
	autoResize: true,
	autoDensity: true,
	antialias: true,
	forceFXAA: true,
	backgroundColor: BACKGRDOUND
});
app.ROUND_PIXELS = true;
document.body.appendChild(app.view);

const sound_move = PIXI.sound.Sound.from({
	url: '/static/resources/sound/eat.wav',
	preload: true,
});

// Board
let Box_Size = Math.min(app.screen.width, app.screen.height) / 15;

let Board = new PIXI.Container();
Board.pivot.set(0.5);
Board.sortableChildren = true;

let Board_Border = new PIXI.Graphics();
Board_Border.lineStyle(1, BORDER);
Board_Border.drawRect(0, 0, 15*Box_Size, 15*Box_Size);
Board.addChild(Board_Border);

let Board_Background = new PIXI.Graphics();
Board_Background.beginFill(BOARD);
Board_Background.drawRect(0, 0, 15*Box_Size, 15*Box_Size);
Board_Background.endFill();
Board.addChild(Board_Background);


let Board_Path = new PIXI.Graphics();
Board_Path.lineStyle(1, BORDER);
for (var i = 6 - 1; i >= 0; i--) {
	if (i == 1) {
		Board_Path.beginFill(RED);
		Board_Path.drawRect(i*Box_Size, 6*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect(i*Box_Size, 6*Box_Size, Box_Size, Box_Size);
	}
	if (i != 0) {
		Board_Path.beginFill(RED);
		Board_Path.drawRect(i*Box_Size, 7*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect(i*Box_Size, 7*Box_Size, Box_Size, Box_Size);
	}
	Board_Path.drawRect(i*Box_Size, 8*Box_Size, Box_Size, Box_Size);

	Board_Path.drawRect(6*Box_Size, i*Box_Size, Box_Size, Box_Size);
	if (i != 0) {
		Board_Path.beginFill(GREEN);
		Board_Path.drawRect(7*Box_Size, i*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect(7*Box_Size, i*Box_Size, Box_Size, Box_Size);
	}
	if (i == 1) {
		Board_Path.beginFill(GREEN);
		Board_Path.drawRect(8*Box_Size, i*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect(8*Box_Size, i*Box_Size, Box_Size, Box_Size);
	}
	
	Board_Path.drawRect((9+i)*Box_Size, 6*Box_Size, Box_Size, Box_Size);
	if (i != 5) {
		Board_Path.beginFill(YELLOW);
		Board_Path.drawRect((9+i)*Box_Size, 7*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect((9+i)*Box_Size, 7*Box_Size, Box_Size, Box_Size);
	}
	if (i == 4) {
		Board_Path.beginFill(YELLOW);
		Board_Path.drawRect((9+i)*Box_Size, 8*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect((9+i)*Box_Size, 8*Box_Size, Box_Size, Box_Size);
	}

	if (i == 4) {
		Board_Path.beginFill(BLUE);
		Board_Path.drawRect(6*Box_Size, (9+i)*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect(6*Box_Size, (9+i)*Box_Size, Box_Size, Box_Size);
	}
	if (i != 5) {
		Board_Path.beginFill(BLUE);
		Board_Path.drawRect(7*Box_Size, (9+i)*Box_Size, Box_Size, Box_Size);
		Board_Path.endFill();
	} else {
		Board_Path.drawRect(7*Box_Size, (9+i)*Box_Size, Box_Size, Box_Size);
	}
	Board_Path.drawRect(8*Box_Size, (9+i)*Box_Size, Box_Size, Box_Size);
}

Board_Path.lineStyle(0);
Board_Path.beginFill(RED);
Board_Path.moveTo(6*Box_Size, 6*Box_Size);
Board_Path.lineTo(7.5*Box_Size, 7.5*Box_Size);
Board_Path.lineTo(6*Box_Size, 9*Box_Size);
Board_Path.endFill();

Board_Path.beginFill(GREEN);
Board_Path.moveTo(6*Box_Size, 6*Box_Size);
Board_Path.lineTo(7.5*Box_Size, 7.5*Box_Size);
Board_Path.lineTo(9*Box_Size, 6*Box_Size);
Board_Path.endFill();

Board_Path.beginFill(YELLOW);
Board_Path.moveTo(9*Box_Size, 6*Box_Size);
Board_Path.lineTo(7.5*Box_Size, 7.5*Box_Size);
Board_Path.lineTo(9*Box_Size, 9*Box_Size);
Board_Path.endFill();

Board_Path.beginFill(BLUE);
Board_Path.moveTo(6*Box_Size, 9*Box_Size);
Board_Path.lineTo(7.5*Box_Size, 7.5*Box_Size);
Board_Path.lineTo(9*Box_Size, 9*Box_Size);
Board_Path.endFill();

Board_Path.cacheAsBitmap = true;
Board.addChild(Board_Path);

var Path_RED = [];
Path_RED[0] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[1] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[2] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[3] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[4] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[5] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_RED[6] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_RED[7] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_RED[8] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_RED[9] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_RED[10] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_RED[11] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_RED[12] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_RED[13] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_RED[14] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_RED[15] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_RED[16] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_RED[17] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_RED[18] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[19] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[20] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[21] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[22] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[23] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[24] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[25] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[26] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[27] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[28] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[29] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[30] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[31] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_RED[32] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_RED[33] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_RED[34] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_RED[35] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_RED[36] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_RED[37] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_RED[38] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_RED[39] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_RED[40] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_RED[41] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_RED[42] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_RED[43] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_RED[44] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[45] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[46] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[47] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[48] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[49] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_RED[50] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[51] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[52] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_RED[53] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[54] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[55] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[56] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[57] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_RED[58] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};

var Path_GREEN = [];
Path_GREEN[0] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_GREEN[1] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_GREEN[2] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_GREEN[3] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_GREEN[4] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_GREEN[5] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[6] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[7] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[8] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[9] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[10] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[11] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_GREEN[12] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[13] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[14] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[15] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[16] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[17] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[18] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_GREEN[19] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_GREEN[20] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_GREEN[21] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_GREEN[22] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_GREEN[23] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_GREEN[24] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_GREEN[25] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_GREEN[26] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_GREEN[27] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_GREEN[28] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_GREEN[29] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_GREEN[30] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_GREEN[31] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[32] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[33] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[34] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[35] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[36] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_GREEN[37] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_GREEN[38] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[39] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[40] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[41] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[42] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[43] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_GREEN[44] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_GREEN[45] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_GREEN[46] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_GREEN[47] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_GREEN[48] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_GREEN[49] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_GREEN[50] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_GREEN[51] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_GREEN[52] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_GREEN[53] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_GREEN[54] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_GREEN[55] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_GREEN[56] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_GREEN[57] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_GREEN[58] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};

Path_YELLOW = [];
Path_YELLOW[0] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[1] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[2] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[3] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[4] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[5] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_YELLOW[6] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_YELLOW[7] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_YELLOW[8] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_YELLOW[9] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_YELLOW[10] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_YELLOW[11] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_YELLOW[12] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_YELLOW[13] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_YELLOW[14] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_YELLOW[15] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_YELLOW[16] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_YELLOW[17] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_YELLOW[18] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[19] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[20] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[21] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[22] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[23] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[24] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[25] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[26] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[27] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[28] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[29] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[30] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[31] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_YELLOW[32] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_YELLOW[33] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_YELLOW[34] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_YELLOW[35] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_YELLOW[36] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_YELLOW[37] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_YELLOW[38] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_YELLOW[39] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_YELLOW[40] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_YELLOW[41] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_YELLOW[42] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_YELLOW[43] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_YELLOW[44] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[45] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[46] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[47] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[48] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[49] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_YELLOW[50] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[51] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[52] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_YELLOW[53] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[54] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[55] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[56] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[57] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_YELLOW[58] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};

Path_BLUE = [];
Path_BLUE[0] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_BLUE[1] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_BLUE[2] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_BLUE[3] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_BLUE[4] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_BLUE[5] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[6] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[7] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[8] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[9] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[10] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[11] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_BLUE[12] = {x: roundPixel((0*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[13] = {x: roundPixel((1*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[14] = {x: roundPixel((2*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[15] = {x: roundPixel((3*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[16] = {x: roundPixel((4*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[17] = {x: roundPixel((5*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[18] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_BLUE[19] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_BLUE[20] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_BLUE[21] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_BLUE[22] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_BLUE[23] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_BLUE[24] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_BLUE[25] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((0*Box_Size)+(Box_Size/2))};
Path_BLUE[26] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((1*Box_Size)+(Box_Size/2))};
Path_BLUE[27] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((2*Box_Size)+(Box_Size/2))};
Path_BLUE[28] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((3*Box_Size)+(Box_Size/2))};
Path_BLUE[29] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((4*Box_Size)+(Box_Size/2))};
Path_BLUE[30] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((5*Box_Size)+(Box_Size/2))};
Path_BLUE[31] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[32] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[33] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[34] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[35] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[36] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((6*Box_Size)+(Box_Size/2))};
Path_BLUE[37] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((7*Box_Size)+(Box_Size/2))};
Path_BLUE[38] = {x: roundPixel((14*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[39] = {x: roundPixel((13*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[40] = {x: roundPixel((12*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[41] = {x: roundPixel((11*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[42] = {x: roundPixel((10*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[43] = {x: roundPixel((9*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};
Path_BLUE[44] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_BLUE[45] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_BLUE[46] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_BLUE[47] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_BLUE[48] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_BLUE[49] = {x: roundPixel((8*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_BLUE[50] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_BLUE[51] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((14*Box_Size)+(Box_Size/2))};
Path_BLUE[52] = {x: roundPixel((6*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_BLUE[53] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((13*Box_Size)+(Box_Size/2))};
Path_BLUE[54] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((12*Box_Size)+(Box_Size/2))};
Path_BLUE[55] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((11*Box_Size)+(Box_Size/2))};
Path_BLUE[56] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((10*Box_Size)+(Box_Size/2))};
Path_BLUE[57] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((9*Box_Size)+(Box_Size/2))};
Path_BLUE[58] = {x: roundPixel((7*Box_Size)+(Box_Size/2)), y: roundPixel((8*Box_Size)+(Box_Size/2))};

class Home extends PIXI.Graphics {
	constructor(color) {
		super();
		this.color = color;
		this.beginFill(color);
		this.lineStyle(2, 0xffffff);
		this.room = [];
		switch(color) {
			case RED:
				this.drawCircle(3*Box_Size, 3*Box_Size, 2.5*Box_Size);
				this.room.push({x: roundPixel(2*Box_Size), y: roundPixel(2*Box_Size)});
				this.room.push({x: roundPixel(4*Box_Size), y: roundPixel(2*Box_Size)});
				this.room.push({x: roundPixel(2*Box_Size), y: roundPixel(4*Box_Size)});
				this.room.push({x: roundPixel(4*Box_Size), y: roundPixel(4*Box_Size)});
				break;
			case GREEN:
				this.drawCircle(12*Box_Size, 3*Box_Size, 2.5*Box_Size);
				this.room.push({x: roundPixel(11*Box_Size), y: roundPixel(2*Box_Size)});
				this.room.push({x: roundPixel(13*Box_Size), y: roundPixel(2*Box_Size)});
				this.room.push({x: roundPixel(11*Box_Size), y: roundPixel(4*Box_Size)});
				this.room.push({x: roundPixel(13*Box_Size), y: roundPixel(4*Box_Size)});
				break;
			case YELLOW:
				this.drawCircle(12*Box_Size, 12*Box_Size, 2.5*Box_Size);
				this.room.push({x: roundPixel(11*Box_Size), y: roundPixel(11*Box_Size)});
				this.room.push({x: roundPixel(13*Box_Size), y: roundPixel(11*Box_Size)});
				this.room.push({x: roundPixel(11*Box_Size), y: roundPixel(13*Box_Size)});
				this.room.push({x: roundPixel(13*Box_Size), y: roundPixel(13*Box_Size)});
				break;
			case BLUE:
				this.drawCircle(3*Box_Size, 12*Box_Size, 2.5*Box_Size);
				this.room.push({x: roundPixel(2*Box_Size), y: roundPixel(11*Box_Size)});
				this.room.push({x: roundPixel(4*Box_Size), y: roundPixel(11*Box_Size)});
				this.room.push({x: roundPixel(2*Box_Size), y: roundPixel(13*Box_Size)});
				this.room.push({x: roundPixel(4*Box_Size), y: roundPixel(13*Box_Size)});
				break;
		}
		this.endFill();
		this.beginFill(BOARD);
		this.room.forEach(function(room) {
			this.drawCircle(room.x, room.y, 0.55*Box_Size);
		}, this);
		this.endFill();
	}
}

var Home_RED = new Home(RED);
var Home_GREEN = new Home(GREEN);
var Home_YELLOW = new Home(YELLOW);
var Home_BLUE = new Home(BLUE);
Board.addChild(Home_RED);
Board.addChild(Home_GREEN);
Board.addChild(Home_YELLOW);
Board.addChild(Home_BLUE);

var SAFE_Path = Array.prototype.concat(Path_RED.slice(52,59), Path_GREEN.slice(52,59), Path_YELLOW.slice(52,59), Path_BLUE.slice(52,59), Home_RED.room, Home_GREEN.room, Home_YELLOW.room, Home_BLUE.room);

class Piece extends PIXI.Graphics {
	constructor(sid, color) {
		super();
		this.color = color;
		this.beginFill(color);
		this.lineStyle(2, 0xffffff);
		this.drawCircle(0, 0, Box_Size/3);
		this.endFill();
		this.zIndex = 10;
		this.pos = 0;
		this.sid = sid;
		switch(color) {
			case RED:
				this.Home = Home_RED;
				this.Room = this.Home.room[this.sid];
				this.Path = [this.Room, ...Path_RED];;
				break;
			case GREEN:
				this.Home = Home_GREEN;
				this.Room = this.Home.room[this.sid];
				this.Path = [this.Room, ...Path_GREEN];;
				break;
			case YELLOW:
				this.Home = Home_YELLOW;
				this.Room = this.Home.room[this.sid];
				this.Path = [this.Room, ...Path_YELLOW];;
				break;
			case BLUE:
				this.Home = Home_BLUE;
				this.Room = this.Home.room[this.sid];
				this.Path = [this.Room, ...Path_BLUE];;
				break;
		}
		this.buttonMode = true;
		this.interactive = false;
		this.position.copyFrom(this.Room);
		this.on('pointerdown', this.Move);
	}
	isSafe() {
		if (SAFE_Path.some(p => (equal(p.x, this.x) && equal(p.y, this.y)))) {
			return true;
		}
		return false;
	}
	canMove() {
		let steps = dice.value;
		if ((this.pos + steps > this.Path.length - 1) || (this.pos === 0 && steps != 6)) {
			return false;
		}
		return true;
	}
	Move() {
		if (!this.canMove()) {
			return;
		}
		if (this.pos === 0) {
			this.pos += 1;
			this.position.copyFrom(this.Path[this.pos]);
			extraTurn();
			return;
		}
		let steps = dice.value;
		let old_pos = this.pos;
		this.pos += steps;
		let killed_enemies = [];
		switch(this.color) {
			case RED:
				Array.prototype.concat(Green_Pieces, Yellow_Pieces, Blue_Pieces).forEach(function (piece) {
					if (!piece.isSafe()) {
						if (testForCollision(this, piece)) {
							piece.pos = 0;
							killed_enemies.push(piece);
						}
					}
				}, this);
				break;
			case GREEN:
				Array.prototype.concat(Red_Pieces, Yellow_Pieces, Blue_Pieces).forEach(function (piece) {
					if (!piece.isSafe()) {
						if (testForCollision(this, piece)) {
							piece.pos = 0;
							killed_enemies.push(piece);
						}
					}
				}, this);
				break;
			case YELLOW:
				Array.prototype.concat(Green_Pieces, Red_Pieces, Blue_Pieces).forEach(function (piece) {
					if (!piece.isSafe()) {
						if (testForCollision(this, piece)) {
							piece.pos = 0;
							killed_enemies.push(piece);
						}
					}
				}, this);
				break;
			case BLUE:
				Array.prototype.concat(Green_Pieces, Yellow_Pieces, Red_Pieces).forEach(function (piece) {
					if (!piece.isSafe()) {
						if (testForCollision(this, piece)) {
							piece.pos = 0;
							killed_enemies.push(piece);
						}
					}
				}, this);
				break;
		}
		const timeline = gsap.timeline();
		for (var i = 1; i <= steps; i++) {
			timeline.to(this, 0.07, this.Path[old_pos+i]);
			sound_move.play();
			if (i == steps) {
				killed_enemies.forEach(function(piece) {
					timeline.to(piece, 0, piece.Room)
				});
			}
		}
		if (killed_enemies.length > 0 || steps === 6) {
			extraTurn();
		} else {
			nextTurn();
		}
	}
}

class Piece_Text extends PIXI.Text {
	constructor() {
		super('', {fontFamily : 'Arial', fontSize: Box_Size*0.37, fill : 0xffffff, align : 'center'});
		this.anchor.set(0.5);
		this.position.copyFrom(Board);
		this.zIndex = 100;
	}
}

var Red_Pieces = [];
var Red_Pieces_Text = [];
var Green_Pieces = [];
var Green_Pieces_Text = [];
var Yellow_Pieces = [];
var Yellow_Pieces_Text = [];
var Blue_Pieces = [];
var Blue_Pieces_Text = [];
for (var i = 4 - 1; i >= 0; i--) {
	var piece;
	piece = new Piece(i, RED);
	Red_Pieces.push(piece);
	Board.addChild(piece);
	piece = new Piece(i, GREEN);
	Green_Pieces.push(piece);
	Board.addChild(piece);
	piece = new Piece(i, YELLOW);
	Yellow_Pieces.push(piece);
	Board.addChild(piece);
	piece = new Piece(i, BLUE);
	Blue_Pieces.push(piece);
	Board.addChild(piece);

	var text;
	text = new Piece_Text();
	Red_Pieces_Text.push(text);
	Board.addChild(text);
	text = new Piece_Text();
	Green_Pieces_Text.push(text);
	Board.addChild(text);
	text = new Piece_Text();
	Yellow_Pieces_Text.push(text);
	Board.addChild(text);
	text = new Piece_Text();
	Blue_Pieces_Text.push(text);
	Board.addChild(text);
}

class Player_Name extends PIXI.Text {
	constructor(color, name) {
		super(name, {fontFamily : 'Arial', fontSize: 0.35*Box_Size, fill : 0x333333, align : 'center'});
		this.anchor.set(0.5);
		switch(color) {
			case RED:
				this.position.set(3*Box_Size, 0.25*Box_Size);
				break;
			case GREEN:
				this.position.set(12*Box_Size, 0.25*Box_Size);
				break;
			case YELLOW:
				this.position.set(12*Box_Size, 14.75*Box_Size);
				break;
			case BLUE:
				this.position.set(3*Box_Size, 14.75*Box_Size);
				break;
		}
	}
}

class Player_Percentage extends PIXI.Text {
	constructor(color) {
		super('0%', {fontFamily : 'Arial', fontSize: 0.35*Box_Size, fill : 0x333333, align : 'center'});
		this.anchor.set(0.5);
		switch(color) {
			case RED:
				this.position.set(3*Box_Size, 3*Box_Size);
				break;
			case GREEN:
				this.position.set(12*Box_Size, 3*Box_Size);
				break;
			case YELLOW:
				this.position.set(12*Box_Size, 12*Box_Size);
				break;
			case BLUE:
				this.position.set(3*Box_Size, 12*Box_Size);
				break;
		}
	}
}

let Player_RED_Percentage = new Player_Percentage(RED);
Board.addChild(Player_RED_Percentage);
let Player_GREEN_Percentage = new Player_Percentage(GREEN);
Board.addChild(Player_GREEN_Percentage);
let Player_YELLOW_Percentage = new Player_Percentage(YELLOW);
Board.addChild(Player_YELLOW_Percentage);
let Player_BLUE_Percentage = new Player_Percentage(BLUE);
Board.addChild(Player_BLUE_Percentage);

function Player(index, color, pieces, name, percentage) {
	this.index = index;
	this.color = color;
	this.pieces = pieces;
	this.name = name;
	this.percentage = percentage;
}
Player.prototype.calcPercentage = function() {
	const path_length = 59;
	var totalPos = 0;
	this.pieces.forEach(function(piece) {
		totalPos += piece.pos;
	});
	this.percentage.text = 100*((totalPos / this.pieces.length) / path_length)+'%';
}

var Players = [];
let Player_RED = new Player(0, RED, Red_Pieces, "Player 1", Player_RED_Percentage);
let Player_GREEN =  new Player(1, GREEN, Green_Pieces, "Player 2", Player_GREEN_Percentage);
let Player_YELLOW = new Player(2, YELLOW, Yellow_Pieces, "Player 3", Player_YELLOW_Percentage);
let Player_BLUE = new Player(3, BLUE, Blue_Pieces, "Player 4", Player_BLUE_Percentage);

Players.push(Player_RED, Player_GREEN, Player_YELLOW, Player_BLUE);

Players.forEach(function(player) {
	Board.addChild(new Player_Name(player.color, player.name));
});

var current_Player = Players[Math.floor(Math.random() * Players.length)];

class Dice extends PIXI.Graphics {
	constructor() {
		super();
		this.beginFill(0xffffff);
		this.lineStyle(2, BORDER);
		this.drawRect(0, 0, 1.5*Box_Size, 1.5*Box_Size);
		this.endFill();
		this.zIndex = 5000;
		this.rolling = false;
		this.value = Math.floor(Math.random() * 6) + 1;;
		this.interactive = true;
		this.buttonMode = true;
		this.acceleration = new PIXI.Point(0);
		//this.direction = NaN;
		this.power = NaN;
		this.speed = 0.5;
		this
			.on('pointerdown', this.onDragStart)
			.on('pointerup', this.onDragEnd)
			.on('pointerupoutside', this.onDragEnd)
			.on('pointermove', this.onDragMove);
	}
	changeColor(color) {
		this.tint = color
	}
	onDragStart(event) {
		this.data = event.data;
		this.alpha = 0.5;
		this.dragging = true;
		let pivot_pos = this.data.getLocalPosition(this);
		this.pivot.set(pivot_pos.x, pivot_pos.y);
		const newPosition = this.data.getLocalPosition(this.parent);
		this.x = newPosition.x;
		this.y = newPosition.y;
		//this.direction = NaN;
		this.roll();
	}
	onDragEnd() {
		this.alpha = 1;
		this.dragging = false;
		this.data = null;
		//this.roll();
	}
	onDragMove() {
		if (this.dragging) {
			const pointerPosition = this.data.getLocalPosition(this.parent);
			this.power = distanceBetweenTwoPoints(
				pointerPosition,
				this.position,
			);
			this.direction = Math.atan2(pointerPosition.y - this.y, pointerPosition.x - this.x);
		}
	}
	roll() {
		this.interactive = false;
		this.rolling = true;
		this.value = Math.floor(Math.random() * 6) + 1;
		//this.acceleration.set(Math.cos(this.direction)*this.power*this.speed, Math.sin(this.direction)*this.power*this.speed);
	}
	roll_callback() {
		this.rolling = false;
		let piecesthatcanmove = 0;
		let apiecethatcanmove;
		Players.forEach(function(player) {
			if (player == current_Player) {
				player.pieces.forEach(function (piece) {
					if (piece.canMove()) {
						piece.interactive = true;
						apiecethatcanmove = piece;
						piecesthatcanmove++;
					} else {
						piece.interactive = false;
					}
				});
			} else {
				player.pieces.forEach(function (piece) {
					piece.interactive = false;
				});
			}
		});
		if (piecesthatcanmove === 0) {
			nextTurn();
		} else if (piecesthatcanmove === 1) {
			apiecethatcanmove.Move();
		}
	}
}


var dice = new Dice();
var dice_text = new PIXI.Text('', {fontFamily : 'Arial', fontSize: Box_Size, fill : 0x000000, align : 'center'});
dice_text.anchor.set(0.5);
dice_text.zIndex = 5100;
Board.addChild(dice);
Board.addChild(dice_text);

function DiceAnimation(delta) {
	/*if (dice.x - dice.pivot.x < 0 || dice.x - dice.pivot.x > (app.screen.width - 2*dice.parent.x - dice.width)) {
		dice.acceleration.x = -dice.acceleration.x;
	}
	if (dice.y - dice.pivot.y < 0 || dice.y - dice.pivot.y > (app.screen.height - 2*dice.parent.y - dice.height)) {
		dice.acceleration.y = -dice.acceleration.y;
	}*/
	if (dice.rolling) {
		dice.x += dice.acceleration.x * delta;
		dice.y += dice.acceleration.y * delta;
		if (dice.acceleration.x > 0.001 || dice.acceleration.y > 0.001) {
			//dice.value = Math.floor(Math.random() * 6) + 1;
			dice.acceleration.set(dice.acceleration.x * 0.88, dice.acceleration.y * 0.88);
		} else {
			dice.acceleration.set(0);
			dice.roll_callback();
		}
	}
	dice_text.text = dice.value;
	dice_text.position.set(dice.x - dice.pivot.x + dice.width/2, dice.y - dice.pivot.y + dice.height/2);
}

Board.x = Math.max((app.screen.width / 2) - (Board.width / 2), 0);
Board.y = Math.max((app.screen.height / 2) - (Board.height / 2), 0);
app.stage.addChild(Board);

app.ticker.add(PicesAnimation);
app.ticker.add(DiceAnimation);

function temp() {
	Players.forEach(function(player) {
		player.calcPercentage();
	});
}
setInterval(temp, 500);


function PicesAnimation() {
	Players.forEach(function(player) {
		if (player == current_Player) {
			player.pieces.forEach(function (piece) {
				if (piece.interactive) {
					piece.filters = [
						new PIXI.filters.GlowFilter({ distance: 10, outerStrength: 1, color: 0x000000 })
					];
				} else {
					piece.filters = [];
				}
			});
		} else {
			player.pieces.forEach(function (piece) {
				piece.filters = [];
			});
		}
	});
	for (var i = Red_Pieces.length - 1; i >= 0; i--) {
		var numberOfCollisions = 0;
		for (var j = Red_Pieces.length - 1; j >= i + 1; j--) {
			Red_Pieces_Text[i].visible = false;
			if (testForAABB(Red_Pieces[i], Red_Pieces[j])) {
				numberOfCollisions++;
				Red_Pieces_Text[j].visible = false;
			}
		}
		if (numberOfCollisions > 0) {
			Red_Pieces_Text[i].text = 'x'+(numberOfCollisions+1);
			Red_Pieces_Text[i].position.copyFrom(Red_Pieces[i]);
			Red_Pieces_Text[i].visible = true;
		}
	}
	for (var i = Green_Pieces.length - 1; i >= 0; i--) {
		var numberOfCollisions = 0;
		for (var j = Green_Pieces.length - 1; j >= i + 1; j--) {
			Green_Pieces_Text[i].visible = false;
			if (testForAABB(Green_Pieces[i], Green_Pieces[j])) {
				numberOfCollisions++;
				Green_Pieces_Text[j].visible = false;
			}
		}
		if (numberOfCollisions > 0) {
			Green_Pieces_Text[i].text = 'x'+(numberOfCollisions+1);
			Green_Pieces_Text[i].position.copyFrom(Green_Pieces[i]);
			Green_Pieces_Text[i].visible = true;
		}
	}
	for (var i = Yellow_Pieces.length - 1; i >= 0; i--) {
		var numberOfCollisions = 0;
		for (var j = Yellow_Pieces.length - 1; j >= i + 1; j--) {
			Yellow_Pieces_Text[i].visible = false;
			if (testForAABB(Yellow_Pieces[i], Yellow_Pieces[j])) {
				numberOfCollisions++;
				Yellow_Pieces_Text[j].visible = false;
			}
		}
		if (numberOfCollisions > 0) {
			Yellow_Pieces_Text[i].text = 'x'+(numberOfCollisions+1);
			Yellow_Pieces_Text[i].position.copyFrom(Yellow_Pieces[i]);
			Yellow_Pieces_Text[i].visible = true;
		}
	}
	for (var i = Blue_Pieces.length - 1; i >= 0; i--) {
		var numberOfCollisions = 0;
		for (var j = Blue_Pieces.length - 1; j >= i + 1; j--) {
			Blue_Pieces_Text[i].visible = false;
			if (testForAABB(Blue_Pieces[i], Blue_Pieces[j])) {
				numberOfCollisions++;
				Blue_Pieces_Text[j].visible = false;
			}
		}
		if (numberOfCollisions > 0) {
			Blue_Pieces_Text[i].text = 'x'+(numberOfCollisions+1);
			Blue_Pieces_Text[i].position.copyFrom(Blue_Pieces[i]);
			Blue_Pieces_Text[i].visible = true;
		}
	}
}

function BringPiecesToFront(color) {
	var my_pieces, other_pieces, my_pieces_texts, other_pieces_texts;
	switch(color) {
		case RED:
			my_pieces = Red_Pieces;
			other_pieces = Array.prototype.concat(Green_Pieces, Yellow_Pieces, Blue_Pieces);
			my_pieces_texts = Red_Pieces_Text;
			other_pieces_texts = Array.prototype.concat(Green_Pieces_Text, Yellow_Pieces_Text, Blue_Pieces_Text);
			break;
		case GREEN:
			my_pieces = Green_Pieces;
			other_pieces = Array.prototype.concat(Red_Pieces, Yellow_Pieces, Blue_Pieces);
			my_pieces_texts = Green_Pieces_Text;
			other_pieces_texts = Array.prototype.concat(Red_Pieces_Text, Yellow_Pieces_Text, Blue_Pieces_Text);
			break;
		case YELLOW:
			my_pieces = Yellow_Pieces;
			other_pieces = Array.prototype.concat(Green_Pieces, Red_Pieces, Blue_Pieces);
			my_pieces_texts = Yellow_Pieces_Text;
			other_pieces_texts = Array.prototype.concat(Green_Pieces_Text, Red_Pieces_Text, Blue_Pieces_Text);
			break;
		case BLUE:
			my_pieces = Blue_Pieces;
			other_pieces = Array.prototype.concat(Green_Pieces, Yellow_Pieces, Red_Pieces);
			my_pieces_texts = Blue_Pieces_Text;
			other_pieces_texts = Array.prototype.concat(Green_Pieces_Text, Yellow_Pieces_Text, Red_Pieces_Text);
			break;
	}
	my_pieces.forEach(function (piece) {
		piece.zIndex = 1000;
	});
	other_pieces.forEach(function (piece) {
		piece.zIndex = 10;
	});
	my_pieces_texts.forEach(function (text) {
		text.zIndex = 1100;
	});
	other_pieces_texts.forEach(function (text) {
		text.zIndex = 100;
	});
	Board.updateTransform();
}

function SwitchTurn(Player) {
	Players.forEach(function(player) {
		player.pieces.forEach(function (piece) {
			piece.interactive = false;
		});
	});
	current_Player = Player;
	BringPiecesToFront(Player.color);
	dice.changeColor(Player.color);
	dice.interactive = true;
}

function nextTurn() {
	let next = current_Player.index + 1;
	if (next > Players.length - 1) {
		next = 0;
	}
	SwitchTurn(Players[next]);
}

function extraTurn() {
	current_Player.pieces.forEach(function (piece) {
		piece.interactive = false;
	});
	dice.interactive = true;
}

SwitchTurn(current_Player);
