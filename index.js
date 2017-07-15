'use strict'
const spawn = require('child_process').spawn;

let micProc = spawn('sox', [
        '-b', '32',
        '--endian', 'little', 
        '-e', 'unsigned-integer', 
        '-c', '1', 
        '-r', '44100', 
        '-t', 'waveaudio', 'default', 
        '-p', 
        '--buffer', '512']);

micProc.on('error', (error) => {
    console.log(error);
});
micProc.stderr.on('error', (error) => {
    console.log(error);
});
micProc.stderr.on('data', (info) => {
    console.log(info);
});

let micStream = micProc.stdout;

let detectPitch = require('detect-pitch');

var fs = require('fs');
var myWritableStream = fs.WriteStream('output.raw');


// 390
// 516
// 347
// 444

let cent = 1.0005777895;
let a4 = 440;

let toneNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

let bufs = [];
let input = 0;

micStream.pipe( myWritableStream );
// setTimeout(() => {
//     console.log('stopped recording');
//     micProc.kill();
// }, 3000);
micStream.on('data', (buf) => {
    // console.log(buf);
    // console.log(buf.length);
	

	let ui32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint32Array.BYTES_PER_ELEMENT);
	// console.log(ui32);

    bufs.push(Array.prototype.slice.call(ui32, 0));
    if (bufs.length > 5) {
    	bufs.shift();
    }
    let length = detectPitch([].concat.apply([], bufs), 0.6);
    input = length;
});

let termkit = require('terminal-kit');
let term = termkit.terminal;
var ScreenBuffer = termkit.ScreenBuffer;

term.eraseDisplay();
for (let i = 0; i < toneNames.length; i++) {
	term.moveTo.eraseLine.bgBlack.gray(0, 1+i, `${toneNames[i]}4`);
}


let viewport = ScreenBuffer.create({
	dst: term,
	width: term.width-4,
	height: 12,
	x: 4
});
let background = ScreenBuffer.create({
	width: viewport.width,
	height: viewport.height,
	noFill: true
});
background.fill( { attr: { color: 'white' , bgColor: 'black' } } ) ;

let starSprites = ['*', '.', 'o', '+', '°'];
let stars = [];
let farstars = [];

let obstacleSprites = ['@', '&', '#'];
let obstacles = [];

let bonuses = [];

let course = Math.floor(viewport.height / 2);

let ship = course;
let lastShip = ship;
let lastShip1 = lastShip;
let lastShip2 = lastShip1;
let lastShip3 = lastShip2;
let crash = 10;

let lastInputText = "";

var score = 0;
var highscore = 0;

setInterval(() => {
	
	for (let i = 0; i < stars.length; i++) {
		let star = stars[i];
		star.x -= 0.5;
	}
	stars = stars.filter(star => star.x > 0);
	if (Math.random() < .05) {
		stars.push({
			x: viewport.width, 
			y: Math.floor(Math.random() * viewport.height),
			sprite: starSprites[Math.floor(Math.random() * starSprites.length)]});
	} 

	for (let i = 0; i < farstars.length; i++) {
		let star = farstars[i];
		star.x -= 0.25;
	}
	farstars = farstars.filter(star => star.x > 0);
	if (Math.random() < .025) {
		farstars.push({
			x: viewport.width, 
			y: Math.floor(Math.random() * viewport.height),
			sprite: starSprites[Math.floor(Math.random() * starSprites.length)]});
	} 

	for (let i = 0; i < bonuses.length; i++) {
		let bonuse = bonuses[i];
		bonuse.x -= 1;
	}
	bonuses = bonuses.filter(bonuse => bonuse.x > 0);
	if (Math.random() < .03 * (1 + score / 1000)) {
		bonuses.push({
			x: viewport.width, 
			y: Math.floor(Math.random() * viewport.height),
			sprite: obstacleSprites[Math.floor(Math.random() * obstacleSprites.length)]});
	} 
	
	for (let i = 0; i < obstacles.length; i++) {
		let obstacle = obstacles[i];
		obstacle.x -= 1;
	}
	obstacles = obstacles.filter(obstacle => obstacle.x > 0);
	if (Math.random() < .15 * (1 + score / 1000)) {
		obstacles.push({
			x: viewport.width, 
			y: Math.floor(Math.random() * viewport.height),
			sprite: obstacleSprites[Math.floor(Math.random() * obstacleSprites.length)]});
	} 
	
	if (crash > 0) {
		crash--;
	} else {
		lastShip3 = lastShip2;
		lastShip2 = lastShip1;
		lastShip1 = lastShip;
		lastShip = ship;
		if (ship < course) { ship++; }
		else if (ship > course) { ship--; }

		score++;
		for (let i = 0; i < bonuses.length; i++) {
			let bonus = bonuses[i];
			if (bonus.y == ship && bonus.x == 6) {
				score += 50;
				bonus.x = -10;
			}
		}
		for (let i = 0; i < obstacles.length; i++) {
			let obstacle = obstacles[i];
			if (obstacle.y == ship && obstacle.x == 6) {
				score = 0;
				obstacle.x = -10;
				crash = 10;
			}
		}
		if (score > highscore) {
			highscore = score;
		}
	}


	
	background.draw({ dst: viewport, tile: true });

	for (let i = 0; i < farstars.length; i++) {
		let star = farstars[i];

		viewport.put( {
			x: star.x,
			y: star.y,
			attr: { color: 'gray' }
		}, star.sprite);
	}

	for (let i = 0; i < stars.length; i++) {
		let star = stars[i];

		viewport.put( {
			x: star.x,
			y: star.y,
			attr: { color: 'white' }
		}, star.sprite);
	}

	for (let i = 0; i < bonuses.length; i++) {
		let bonus = bonuses[i];

		viewport.put( {
			x: bonus.x,
			y: bonus.y,
			attr: { color: 'brightGreen' }
		}, '*');
	}

	for (let i = 0; i < obstacles.length; i++) {
		let obstacle = obstacles[i];

		viewport.put( {
			x: obstacle.x,
			y: obstacle.y,
			attr: { color: 'brightRed' }
		}, obstacle.sprite);
	}

	viewport.put( {
		x: 0,
		y: course,
		attr: { color: 'brightGreen' }
	}, '>');

	if (crash > 0) {
	} else {
			viewport.put( {
			x: 2,
			y: lastShip3,
			attr: { color: 'red' }
		}, ':');
		viewport.put( {
			x: 3,
			y: lastShip2,
			attr: { color: 'red' }
		}, ':');
		viewport.put( {
			x: 4,
			y: lastShip1,
			attr: { color: 'red' }
		}, '=');
		viewport.put( {
			x: 5,
			y: lastShip,
			attr: { color: 'red' }
		}, '=');	
		viewport.put( {
			x: 6,
			y: ship,
			attr: { color: 'brightYellow' }
		}, '>');
	}


	viewport.draw();

	term.moveTo.eraseLine.bgBlack.bold.green(1, viewport.height + 1,
		`${('000000000' + score).substr(-6)}`);
	term.moveTo.eraseLine.bgBlack.bold.green(1, viewport.height + 2,
		`${('000000000' + highscore).substr(-6)}`);

	if (input > 0) {
	    let pitch = 44100 / input;
	    let cents = 1200 * Math.log(pitch / a4) / Math.log(2);

	    // console.log(`A4 +${cents} cents`);
	    let tone = Math.round(cents / 100);
	    let toneNameIndex = tone + 9;
	    let relCents = cents - tone * 100;
	    let octave = 4;
	    while (toneNameIndex >= toneNames.length) {
	    	octave++;
	    	toneNameIndex -= toneNames.length;
	    }
	    while (toneNameIndex < 0) {
	    	octave--;
	    	toneNameIndex += toneNames.length;
	    }
	    let fullToneName = `${toneNames[toneNameIndex]}${octave}`;
	    let centText = `${((relCents > 0) ? "+" : "")}${Math.round(relCents)} cents`;
		
		if (octave == 4) {
			course = toneNameIndex;
		}
		lastInputText = `${fullToneName} ${centText} (${Math.round(pitch)} Hz)`;
		term.moveTo.eraseLine.bgBlack.brightGreen(1, viewport.height + 3,
			lastInputText);	
	} else {
		term.moveTo.eraseLine.bgBlack.gray(1, viewport.height + 3, lastInputText);
	}
}, 1000 / 20);



