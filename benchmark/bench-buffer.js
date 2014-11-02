var fs = require('fs');
var path = require('path');
var Benchmark = require('benchmark');
var xxhash = require('../dest/xxhash-buffer.common.js');
var inputFileName = path.normalize( process.argv[2] || __dirname + '/lorem_1mb.txt' )
console.log('Input file:', inputFileName)

var input = fs.readFileSync(inputFileName);
var seed = 0xABCD;

var suite = new Benchmark.Suite
suite
	.add('XXH one step', function() {
	    var h = xxhash.BufferXXH.digestHex(input, seed);
	})
	.add('XXH', function() {
        var xxh = new xxhash.BufferXXH(seed);
		var h = xxh.update(input).digestHex();
	})
	// add listeners
	.on('cycle', function(event) {
	  console.log( String(event.target) )
	})
	.run()
