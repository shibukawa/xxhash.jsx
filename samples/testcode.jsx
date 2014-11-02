import "console.jsx";
import "src/xxhash.jsx";
import "js/nodejs.jsx";

class _Main {
    static function main(args :string[]) : void {
        var inputBuffer = node.fs.readFileSync('benchmark/lorem_1mb.txt');
        var input = new Uint32Array(inputBuffer as __noconvert__ ArrayBuffer).buffer;
        var seed = 0xABCD;

        for (var i = 0; i < 60; i++) {
	        XXH.digest(input, seed);
        }

        JSX.postProfileResults("http://localhost:2012/post-profile");
    }
}
