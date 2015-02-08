import "console.jsx";

__export__ class XXH {
    static function digest(source : variant, seed : number) : number {
        if (source instanceof string) {
            return StringXXH.digest(source as string, seed);
        } else if (source instanceof ArrayBuffer) {
            return ArrayBufferXXH.digest(source as ArrayBuffer, seed);
        } else if (source instanceof Uint8Array) {
            return ArrayBufferXXH.digest(source as Uint8Array, seed);
        }
        return -1;
    }

    static function digestHex(source : variant, seed : number) : string {
        if (source instanceof string) {
            return StringXXH.digestHex(source as string, seed);
        } else if (source instanceof ArrayBuffer) {
            return ArrayBufferXXH.digestHex(source as ArrayBuffer, seed);
        } else if (source instanceof Uint8Array) {
            return ArrayBufferXXH.digestHex(source as Uint8Array, seed);
        }
        return '';
    }
}

native class _XXHMath {
    static function mul(left : number, right : number) : number;
} = '''(function () {
    if (Math.imul) {
        return { mul: Math.imul };
    } else {
        return { mul: function (a, b) {
            var ah  = (a >>> 16) & 0xffff;
            var al = a & 0xffff;
            var bh  = (b >>> 16) & 0xffff;
            var bl = b & 0xffff;
            // the shift by 0 fixes the sign on the high part
            // the final |0 converts the unsigned value into a signed value
            return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)|0);
        }};
    }
})();
''';

class _XXH {
    static const PRIME32_1      : number = 2654435761;
    static const PRIME32_2      : number = 2246822519;
    static const PRIME32_3      : number = 3266489917;
    static const PRIME32_4      : number = 668265263;
    static const PRIME32_5      : number = 374761393;
    static const PRIME32_1plus2 : number = 606290984;

    inline static function low(value : number) : number {
        return value & 0xffff;
    }

    inline static function high(value : number) : number {
        return (value >>> 16) & 0xffff;
    }

    inline static function fromBits(low : number, high : number) : number {
        return (((high | 0) << 16) | (low | 0));
    }

    inline static function rotl(v : number, n : int) : number {
		return (v << n) | (v >>> (32 - n));
    }

    static function update(source : number, low : number, high : number) : number {
		var b00 = _XXH.low(_XXH.PRIME32_2);
		var b16 = _XXH.high(_XXH.PRIME32_2);

        var sLow = _XXH.low(source);
        var sHigh = _XXH.high(source);
		var c16, c00;
		c00 = low * b00;
		c16 = c00 >>> 16;

		c16 += high * b00;
		c16 &= 0xFFFF;  // Not required but improves performance
		c16 += low * b16;

		var a00 = sLow + (c00 & 0xFFFF);
		var a16 = a00 >>> 16;

		a16 += sHigh + (c16 & 0xFFFF);

		var v = (a16 << 16) | (a00 & 0xFFFF);
		v = (v << 13) | (v >>> 19);

		a00 = v & 0xFFFF;
		a16 = v >>> 16;

		b00 = _XXH.low(_XXH.PRIME32_1);
		b16 = _XXH.high(_XXH.PRIME32_1);

		c00 = a00 * b00;
		c16 = c00 >>> 16;

		c16 += a16 * b00;
		c16 &= 0xFFFF; // Not required but improves performance
		c16 += a00 * b16;

        return _XXH.fromBits(c00 & 0xFFFF, c16 & 0xFFFF);
    }
}


class ArrayBufferXXH {
    var _seed : number;
    var _v1 : number;
    var _v2 : number;
    var _v3 : number;
    var _v4 : number;
    var _totalLen : number;
    var _memSize : number;
    var _memory : Uint8Array;
    var _result : number;

    static function digest(input : ArrayBuffer, seed : number) : number {
        var xxh = new ArrayBufferXXH(seed);
        return xxh.update(input).digest();
    }

    static function digestHex(input : ArrayBuffer, seed : number) : string {
        var xxh = new ArrayBufferXXH(seed);
        return xxh.update(input).digestHex();
    }

    static function digest(input : Uint8Array, seed : number) : number {
        var xxh = new ArrayBufferXXH(seed);
        return xxh.update(input).digest();
    }

    static function digestHex(input : Uint8Array, seed : number) : string {
        var xxh = new ArrayBufferXXH(seed);
        return xxh.update(input).digestHex();
    }

    function constructor(seed : number) {
        this.init(seed);
    }

    function init(seed : number) : void {
        this._seed = seed;

		this._v1 = (this._seed + _XXH.PRIME32_1plus2) & 0xffffffff;
		this._v2 = (this._seed + _XXH.PRIME32_2) & 0xffffffff;
		this._v3 = this._seed;
		this._v4 = (this._seed - _XXH.PRIME32_1) & 0xffffffff;
        this._totalLen = 0;
        this._memSize = 0;
        this._memory = null;
        this._result = 0x1ffffffff;
    }

    function update(input : ArrayBuffer) : ArrayBufferXXH {
        return this.update(new Uint8Array(input));
    }

    function update(input : Uint8Array) : ArrayBufferXXH {
        this._result = 0x1ffffffff;
        var p : int = 0;
        var len : int = input.length;
        var bEnd : int = p + len;
        if (len == 0) {
            return this;
        }
        this._totalLen += len;
        if (this._memSize == 0) {
            this._memory = new Uint8Array(16);
        }
        if (this._memSize + len < 16) { // fill in tmp buffer
            this._memory.set(input.subarray(0, len), this._memSize);
            this._memSize += len;
            return this;
        }

        if (this._memSize > 0)   // some data left from previous update
        {
            // XXH_memcpy(this._memory + this._memSize, input, 16-this._memSize);
            this._memory.set(input.subarray(0, 16 - this._memSize), this._memSize);

            var p32 = 0;
            this._v1 = _XXH.update(this._v1,
                (this._memory[p32+1] << 8) | this._memory[p32]
              , (this._memory[p32+3] << 8) | this._memory[p32+2]
            );
            p32 += 4;
            this._v2 = _XXH.update(this._v2,
                (this._memory[p32+1] << 8) | this._memory[p32]
              , (this._memory[p32+3] << 8) | this._memory[p32+2]
            );
            p32 += 4;
            this._v3 = _XXH.update(this._v3,
                (this._memory[p32+1] << 8) | this._memory[p32]
              , (this._memory[p32+3] << 8) | this._memory[p32+2]
            );
            p32 += 4;
            this._v4 = _XXH.update(this._v4,
                (this._memory[p32+1] << 8) | this._memory[p32]
              , (this._memory[p32+3] << 8) | this._memory[p32+2]
            );
            p += 16 - this._memSize;
            this._memSize = 0;
        }

        if (p <= bEnd - 16) {
            var limit = bEnd - 16;
            do {
                this._v1 = _XXH.update(this._v1,
                    (input[p+1] << 8) | input[p]
                  , (input[p+3] << 8) | input[p+2]
                );
                p += 4;
                this._v2 = _XXH.update(this._v2,
                    (input[p+1] << 8) | input[p]
                  , (input[p+3] << 8) | input[p+2]
                );
                p += 4;
                this._v3 = _XXH.update(this._v3,
                    (input[p+1] << 8) | input[p]
                  , (input[p+3] << 8) | input[p+2]
                );
                p += 4;
                this._v4 = _XXH.update(this._v4,
                    (input[p+1] << 8) | input[p]
                  , (input[p+3] << 8) | input[p+2]
                );
                p += 4;
            } while (p <= limit);
        }
        if (p < bEnd) {
            this._memory.set(input.subarray(p, bEnd), this._memSize);
            this._memSize = bEnd - p;
        }
        return this;
    }

    function digestHex() : string {
        var result = this.digest();
        return (result >>> 16).toString(16) + (result & 0xffff).toString(16);
    }

    function digest() : number {
        if (this._result != 0x1ffffffff) {
            return this._result;
        }
        var input = this._memory;
        var p : int = 0;
        var bEnd = this._memSize;
        var h32 : number;
        var h : number;
        var u : number;

        if (this._totalLen >= 16) {
            h32 = _XXH.rotl(this._v1, 1) + _XXH.rotl(this._v2, 7) + _XXH.rotl(this._v3, 12) + _XXH.rotl(this._v4, 18);
        } else {
            h32 = this._seed + _XXH.PRIME32_5;
        }

        h32 += this._totalLen;

        while (p <= bEnd - 4) {
            u = _XXH.fromBits(
                (input[p+1] << 8) | input[p]
              , (input[p+3] << 8) | input[p+2]
            );
            h32 = _XXHMath.mul(_XXH.rotl(h32 + _XXHMath.mul(u, _XXH.PRIME32_3), 17), _XXH.PRIME32_4);
            p += 4;
        }

        while (p < bEnd)
        {
            u = input[p++];
            h32 = _XXHMath.mul(_XXH.rotl((h32 + u * _XXH.PRIME32_5) & 0xffffffff, 11), _XXH.PRIME32_1);
        }

		h = h32 >>> 15;
        h32 = _XXHMath.mul(h32 ^ h, _XXH.PRIME32_2);

		h = h32 >>> 13;
        h32 = _XXHMath.mul(h32 ^ h, _XXH.PRIME32_3);

        h = h32 >>> 16;
		this._result = h32 ^ h;
        return this._result;
    }
}

class StringXXH {
    var _seed : number;
    var _v1 : number;
    var _v2 : number;
    var _v3 : number;
    var _v4 : number;
    var _totalLen : number;
    var _memSize : number;
    var _memory : string;
    var _result : number;

    static function digest(input : string, seed : number) : number {
        var xxh = new StringXXH(seed);
        return xxh.update(input).digest();
    }

    static function digestHex(input : string, seed : number) : string {
        var xxh = new StringXXH(seed);
        return xxh.update(input).digestHex();
    }

    function constructor(seed : number) {
        this.init(seed);
    }

    function init(seed : number) : void {
        this._seed = seed;

		this._v1 = (this._seed + _XXH.PRIME32_1plus2) & 0xffffffff;
		this._v2 = (this._seed + _XXH.PRIME32_2) & 0xffffffff;
		this._v3 = this._seed;
		this._v4 = (this._seed - _XXH.PRIME32_1) & 0xffffffff;
        this._totalLen = 0;
        this._memSize = 0;
        this._memory = '';
        this._result = 0x1ffffffff;
    }

    function update(input : string) : StringXXH {
        this._result = 0x1ffffffff;
        var p : int = 0;
        var len : int = input.length;
        var bEnd : int = p + len;
        if (len == 0) {
            return this;
        }
        this._totalLen += len;
        if (this._memSize == 0) {
            this._memory = '';
        }
        if (this._memSize + len < 16) { // fill in tmp buffer
            this._memory += input;
            this._memSize += len;
            return this;
        }

        if (this._memSize > 0)   // some data left from previous update
        {
            // XXH_memcpy(this._memory + this._memSize, input, 16-this._memSize);
            this._memory += input.slice(0, 16 - this._memSize);

            var p32 = 0;
            this._v1 = _XXH.update(this._v1,
                (this._memory.charCodeAt(p32+1) << 8) | this._memory.charCodeAt(p32)
            ,   (this._memory.charCodeAt(p32+3) << 8) | this._memory.charCodeAt(p32+2)
            );
            p32 += 4;
            this._v2 = _XXH.update(this._v2,
                (this._memory.charCodeAt(p32+1) << 8) | this._memory.charCodeAt(p32)
            ,   (this._memory.charCodeAt(p32+3) << 8) | this._memory.charCodeAt(p32+2)
            );
            p32 += 4;
            this._v3 = _XXH.update(this._v3,
                (this._memory.charCodeAt(p32+1) << 8) | this._memory.charCodeAt(p32)
            ,   (this._memory.charCodeAt(p32+3) << 8) | this._memory.charCodeAt(p32+2)
            );
            p32 += 4;
            this._v4 = _XXH.update(this._v4,
                (this._memory.charCodeAt(p32+1) << 8) | this._memory.charCodeAt(p32)
            ,   (this._memory.charCodeAt(p32+3) << 8) | this._memory.charCodeAt(p32+2)
            );
            p += 16 - this._memSize;
            this._memSize = 0;
            this._memory = '';
        }

        if (p <= bEnd - 16) {
            var limit = bEnd - 16;
            do {
                this._v1 = _XXH.update(this._v1,
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                );
                p += 4;
                this._v2 = _XXH.update(this._v2,
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                );
                p += 4;
                this._v3 = _XXH.update(this._v3,
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                );
                p += 4;
                this._v4 = _XXH.update(this._v4,
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                );
                p += 4;
            } while (p <= limit);
        }
        if (p < bEnd) {
            this._memory += input.slice(p);
            this._memSize = bEnd - p;
        }
        return this;
    }

    function digestHex() : string {
        var result = this.digest();
        return (result >>> 16).toString(16) + (result & 0xffff).toString(16);
    }

    function digest() : number {
        if (this._result != 0x1ffffffff) {
            return this._result;
        }
        var input = this._memory;
        var p : int = 0;
        var bEnd = this._memSize;
        var h32 : number;
        var h : number;
        var u : number;

        if (this._totalLen >= 16) {
            h32 = _XXH.rotl(this._v1, 1) + _XXH.rotl(this._v2, 7) + _XXH.rotl(this._v3, 12) + _XXH.rotl(this._v4, 18);
        } else {
            h32 = this._seed + _XXH.PRIME32_5;
        }

        h32 += this._totalLen;

        while (p <= bEnd - 4) {
            u = _XXH.fromBits(
                (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
            ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
            );
            h32 = _XXHMath.mul(_XXH.rotl(h32 + _XXHMath.mul(u, _XXH.PRIME32_3), 17), _XXH.PRIME32_4);
            p += 4;
        }

        while (p < bEnd)
        {
            u = input.charCodeAt(p++);
            h32 = _XXHMath.mul(_XXH.rotl((h32 + u * _XXH.PRIME32_5) & 0xffffffff, 11), _XXH.PRIME32_1);
        }

		h = h32 >>> 15;
        h32 = _XXHMath.mul(h32 ^ h, _XXH.PRIME32_2);

		h = h32 >>> 13;
        h32 = _XXHMath.mul(h32 ^ h, _XXH.PRIME32_3);

        h = h32 >>> 16;
		this._result = h32 ^ h;
        return this._result;
    }
}
