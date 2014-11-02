import "test-case.jsx";
import "xxhash.jsx";

class _Test extends TestCase
{
    static const seed = 0;

    function join(str : string, num : int) : string {
        var array = [] : string[];
        for (var i = 0; i < num + 1; i++) {
            array.push('');
        }
        return array.join(str);
    }

    function test_small_input_multiple_of_4() : void {
        var input = 'abcd';
        var expected = 'A3643705'; // Computed with xxHash C version
        this.expect(StringXXH.digestHex(input, _Test.seed).toUpperCase()).toBe(expected); 
    }

    function test_medium_input_multiple_of_4() : void {
        var input = this.join('abcd', 1000);
		var expected = 'E18CBEA';
        var xxh = new StringXXH(_Test.seed);
        xxh.update(input);
        this.expect(xxh.digestHex().toUpperCase()).toBe(expected); 
    }

    function test_medium_input() : void {
        var input = this.join('abc', 999);
		var expected = '89DA9B6E';
        var xxh = new StringXXH(_Test.seed);
        xxh.update(input);
        this.expect(xxh.digestHex().toUpperCase()).toBe(expected); 
    }

    function test_small_input() : void {
        var input = 'abc';
		var expected = '32D153FF'; // Computed with xxHash C version
        this.expect(StringXXH.digestHex(input, _Test.seed).toUpperCase()).toBe(expected); 
    }

    function test_split_medium_input_smaller_than_16() : void {
        var input = this.join('abc', 999);
		var expected = '89DA9B6E';
        var xxh = new StringXXH(_Test.seed);
        var result = xxh.update(input.slice(0, 10)).update(input.slice(10)).digestHex();
        this.expect(result.toUpperCase()).toBe(expected);
    }

    function test_split_medium_input_equal_to_16() : void {
        var input = this.join('abc', 999);
		var expected = '89DA9B6E';
        var xxh = new StringXXH(_Test.seed);
        var result = xxh.update(input.slice(0, 16)).update(input.slice(16)).digestHex();
        this.expect(result.toUpperCase()).toBe(expected);
    }

    function test_split_medium_input_bigger_than_16() : void {
        var input = this.join('abc', 999);
		var expected = '89DA9B6E';
        var xxh = new StringXXH(_Test.seed);
        var result = xxh.update(input.slice(0, 16)).update(input.slice(16)).digestHex();
        this.expect(result.toUpperCase()).toBe(expected);
    }
}
