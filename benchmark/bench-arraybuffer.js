var fs = require('fs');
var path = require('path');
var Benchmark = require('benchmark');
var xxhash = require('../dest/xxhash.common.js');
var inputFileName = path.normalize( process.argv[2] || __dirname + '/lorem_1mb.txt' )
console.log('Input file:', inputFileName)

var inputBuffer = fs.readFileSync(inputFileName);
var input = new Uint32Array(inputBuffer).buffer;
var seed = 0xABCD;

var suite = new Benchmark.Suite
suite
	.add('XXH one step', function() {
	    var h = xxhash.XXH.digest(input, seed);
	})
	.add('XXH', function() {
	    var h = xxhash.XXH.digest(input, seed);
	})
	// add listeners
	.on('cycle', function(event) {
	  console.log( String(event.target) )
	})
	.run()
