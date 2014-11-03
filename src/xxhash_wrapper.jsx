native class XXH {
    static function digest(input : variant, seed : number) : number;
    static function digestHex(input : variant, seed : number) : string;
    function constructor(seed : number);
    function init(seed : number) : void;
    function update(inputArray : variant) : XXH;
    function digest() : number;
    function digestHex() : string;
} = '''(function () {

/**
    xxHash implementation in pure Javascript

    Copyright (C) 2013, Pierre Curto
    MIT license
 */

function UINT32 (l, h) {
    if ( !(this instanceof UINT32) )
        return new UINT32(l, h)

    this._low = 0
    this._high = 0
    this.remainder = null
    if (typeof h == 'undefined')
        return fromNumber.call(this, l)

    if (typeof l == 'string')
        return fromString.call(this, l, h)

    fromBits.call(this, l, h)
}

/**
 * Set the current _UINT32_ object with its low and high bits
 * @method fromBits
 * @param {Number} low bits
 * @param {Number} high bits
 * @return ThisExpression
 */
function fromBits (l, h) {
    this._low = l | 0
    this._high = h | 0

    return this
}
UINT32.prototype.fromBits = fromBits

/**
 * Set the current _UINT32_ object from a number
 * @method fromNumber
 * @param {Number} number
 * @return ThisExpression
 */
function fromNumber (value) {
    this._low = value & 0xFFFF
    this._high = value >>> 16

    return this
}
UINT32.prototype.fromNumber = fromNumber

/**
 * Set the current _UINT32_ object from a string
 * @method fromString
 * @param {String} integer as a string
 * @param {Number} radix (optional, default=10)
 * @return ThisExpression
 */
function fromString (s, radix) {
    var value = parseInt(s, radix || 10)

    this._low = value & 0xFFFF
    this._high = value >>> 16

    return this
}
UINT32.prototype.fromString = fromString

/**
 * Convert this _UINT32_ to a number
 * @method toNumber
 * @return {Number} the converted UINT32
 */
UINT32.prototype.toNumber = function () {
    return (this._high << 16) | this._low
}

/**
 * Add two _UINT32_. The current _UINT32_ stores the result
 * @method add
 * @param {Object} other UINT32
 * @return ThisExpression
 */
UINT32.prototype.add = function (other) {
    var a00 = this._low + other._low
    var a16 = a00 >>> 16

    a16 += this._high + other._high

    this._low = a00 & 0xFFFF
    this._high = a16 & 0xFFFF

    return this
}

/**
 * Subtract two _UINT32_. The current _UINT32_ stores the result
 * @method subtract
 * @param {Object} other UINT32
 * @return ThisExpression
 */
UINT32.prototype.subtract = function (other) {
    //TODO inline
    return this.add( other.clone().negate() )
}

/**
 * Multiply two _UINT32_. The current _UINT32_ stores the result
 * @method multiply
 * @param {Object} other UINT32
 * @return ThisExpression
 */
UINT32.prototype.multiply = function (other) {
    /*
        a = a00 + a16
        b = b00 + b16
        a*b = (a00 + a16)(b00 + b16)
            = a00b00 + a00b16 + a16b00 + a16b16

        a16b16 overflows the 32bits
     */
    var a16 = this._high
    var a00 = this._low
    var b16 = other._high
    var b00 = other._low

/* Removed to increase speed under normal circumstances (i.e. not multiplying by 0 or 1)
    // this == 0 or other == 1: nothing to do
    if ((a00 == 0 && a16 == 0) || (b00 == 1 && b16 == 0)) return this

    // other == 0 or this == 1: this = other
    if ((b00 == 0 && b16 == 0) || (a00 == 1 && a16 == 0)) {
        this._low = other._low
        this._high = other._high
        return this
    }
*/

    var c16, c00
    c00 = a00 * b00
    c16 = c00 >>> 16

    c16 += a16 * b00
    c16 &= 0xFFFF       // Not required but improves performance
    c16 += a00 * b16

    this._low = c00 & 0xFFFF
    this._high = c16 & 0xFFFF

    return this
}

/**
 * Negate the current _UINT32_
 * @method negate
 * @return ThisExpression
 */
UINT32.prototype.negate = UINT32.prototype.not = function () {
    var v = ( ~this._low & 0xFFFF ) + 1
    this._low = v & 0xFFFF
    this._high = (~this._high + (v >>> 16)) & 0xFFFF

    return this
}

/**
 * Bitwise XOR
 * @method xor
 * @param {Object} other UINT32
 * @return ThisExpression
 */
UINT32.prototype.xor = function (other) {
    this._low ^= other._low
    this._high ^= other._high

    return this
}

/**
 * Bitwise shift right
 * @method shiftRight
 * @param {Number} number of bits to shift
 * @return ThisExpression
 */
UINT32.prototype.shiftRight = UINT32.prototype.shiftr = function (n) {
    if (n > 16) {
        this._low = this._high >> (n - 16)
        this._high = 0
    } else if (n == 16) {
        this._low = this._high
        this._high = 0
    } else {
        this._low = (this._low >> n) | ( (this._high << (16-n)) & 0xFFFF )
        this._high >>= n
    }

    return this
}

/**
 * Bitwise rotate left
 * @method rotl
 * @param {Number} number of bits to rotate
 * @return ThisExpression
 */
UINT32.prototype.rotateLeft = UINT32.prototype.rotl = function (n) {
    var v = (this._high << 16) | this._low
    v = (v << n) | (v >>> (32 - n))
    this._low = v & 0xFFFF
    this._high = v >>> 16

    return this
}

/**
 * Clone the current _UINT32_
 * @method clone
 * @return {Object} cloned UINT32
 */
UINT32.prototype.clone = function () {
    return new UINT32(this._low, this._high)
}

/*
    Merged this sequence of method calls as it speeds up
    the calculations by a factor of 2
 */
// this.v1.add( other.multiply(PRIME32_2) ).rotl(13).multiply(PRIME32_1);
UINT32.prototype.xxh_update = function (low, high) {
    var b00 = PRIME32_2._low
    var b16 = PRIME32_2._high

    var c16, c00
    c00 = low * b00
    c16 = c00 >>> 16

    c16 += high * b00
    c16 &= 0xFFFF       // Not required but improves performance
    c16 += low * b16

    var a00 = this._low + (c00 & 0xFFFF)
    var a16 = a00 >>> 16

    a16 += this._high + (c16 & 0xFFFF)

    var v = (a16 << 16) | (a00 & 0xFFFF)
    v = (v << 13) | (v >>> 19)

    a00 = v & 0xFFFF
    a16 = v >>> 16

    b00 = PRIME32_1._low
    b16 = PRIME32_1._high

    c00 = a00 * b00
    c16 = c00 >>> 16

    c16 += a16 * b00
    c16 &= 0xFFFF       // Not required but improves performance
    c16 += a00 * b16

    this._low = c00 & 0xFFFF
    this._high = c16 & 0xFFFF
}

/*
 * Constants
 */
var PRIME32_1 = UINT32( '2654435761' )
var PRIME32_2 = UINT32( '2246822519' )
var PRIME32_3 = UINT32( '3266489917' )
var PRIME32_4 = UINT32(  '668265263' )
var PRIME32_5 = UINT32(  '374761393' )

var PRIME32_1plus2 = PRIME32_1.clone().add(PRIME32_2)

/**
 * XXH object used as a constructor or a function
 * @constructor
 * or
 * @param {Object|String} input data
 * @param {Number|UINT32} seed
 * @return ThisExpression
 * or
 * @return {UINT32} xxHash
 */
function XXH () {
    if (arguments.length == 2)
        return new XXH( arguments[1] ).update( arguments[0] )._digest()

    if (!(this instanceof XXH))
        return new XXH( arguments[0] )

    init.call(this, arguments[0])
}

/**
 * Initialize the XXH instance with the given seed
 * @method init
 * @param {Number|Object} seed as a number or an unsigned 32 bits integer
 * @return ThisExpression
 */
 function init (seed) {
    this.seed = seed instanceof UINT32 ? seed.clone() : UINT32(seed)
    this.v1 = this.seed.clone().add(PRIME32_1plus2)
    this.v2 = this.seed.clone().add(PRIME32_2)
    this.v3 = this.seed.clone()
    this.v4 = this.seed.clone().subtract(PRIME32_1)
    this.total_len = 0
    this.memsize = 0
    this.memory = null

    return this
}
XXH.prototype.init = init

/**
 * Add data to be computed for the XXH hash
 * @method update
 * @param {String|Buffer|ArrayBuffer} input as a string or nodejs Buffer or ArrayBuffer
 * @return ThisExpression
 */
XXH.prototype.update = function (input) {
    var isString = typeof input == 'string'
    var isArrayBuffer

    if (input instanceof ArrayBuffer)
    {
        isArrayBuffer = true
        input = new Uint8Array(input);
    }

    var p = 0
    var len = input.length
    var bEnd = p + len

    if (len == 0) return this

    this.total_len += len

    if (this.memsize == 0)
    {
        if (isString) {
            this.memory = ''
        } else if (isArrayBuffer) {
            this.memory = new Uint8Array(16)
        } else {
            this.memory = new Buffer(16)
        }
    }

    if (this.memsize + len < 16)   // fill in tmp buffer
    {
        // XXH_memcpy(this.memory + this.memsize, input, len)
        if (isString) {
            this.memory += input
        } else if (isArrayBuffer) {
            this.memory.set( input.subarray(0, len), this.memsize )
        } else {
            input.copy( this.memory, this.memsize, 0, len )
        }

        this.memsize += len
        return this
    }

    if (this.memsize > 0)   // some data left from previous update
    {
        // XXH_memcpy(this.memory + this.memsize, input, 16-this.memsize);
        if (isString) {
            this.memory += input.slice(0, 16 - this.memsize)
        } else if (isArrayBuffer) {
            this.memory.set( input.subarray(0, 16 - this.memsize), this.memsize )
        } else {
            input.copy( this.memory, this.memsize, 0, 16 - this.memsize )
        }

        var p32 = 0
        if (isString) {
            this.v1.xxh_update(
                (this.memory.charCodeAt(p32+1) << 8) | this.memory.charCodeAt(p32)
            ,   (this.memory.charCodeAt(p32+3) << 8) | this.memory.charCodeAt(p32+2)
            )
            p32 += 4
            this.v2.xxh_update(
                (this.memory.charCodeAt(p32+1) << 8) | this.memory.charCodeAt(p32)
            ,   (this.memory.charCodeAt(p32+3) << 8) | this.memory.charCodeAt(p32+2)
            )
            p32 += 4
            this.v3.xxh_update(
                (this.memory.charCodeAt(p32+1) << 8) | this.memory.charCodeAt(p32)
            ,   (this.memory.charCodeAt(p32+3) << 8) | this.memory.charCodeAt(p32+2)
            )
            p32 += 4
            this.v4.xxh_update(
                (this.memory.charCodeAt(p32+1) << 8) | this.memory.charCodeAt(p32)
            ,   (this.memory.charCodeAt(p32+3) << 8) | this.memory.charCodeAt(p32+2)
            )
        } else {
            this.v1.xxh_update(
                (this.memory[p32+1] << 8) | this.memory[p32]
            ,   (this.memory[p32+3] << 8) | this.memory[p32+2]
            )
            p32 += 4
            this.v2.xxh_update(
                (this.memory[p32+1] << 8) | this.memory[p32]
            ,   (this.memory[p32+3] << 8) | this.memory[p32+2]
            )
            p32 += 4
            this.v3.xxh_update(
                (this.memory[p32+1] << 8) | this.memory[p32]
            ,   (this.memory[p32+3] << 8) | this.memory[p32+2]
            )
            p32 += 4
            this.v4.xxh_update(
                (this.memory[p32+1] << 8) | this.memory[p32]
            ,   (this.memory[p32+3] << 8) | this.memory[p32+2]
            )
        }

        p += 16 - this.memsize
        this.memsize = 0
        if (isString) this.memory = ''
    }

    if (p <= bEnd - 16)
    {
        var limit = bEnd - 16

        do
        {
            if (isString) {
                this.v1.xxh_update(
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                )
                p += 4
                this.v2.xxh_update(
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                )
                p += 4
                this.v3.xxh_update(
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                )
                p += 4
                this.v4.xxh_update(
                    (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
                ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
                )
            } else {
                this.v1.xxh_update(
                    (input[p+1] << 8) | input[p]
                ,   (input[p+3] << 8) | input[p+2]
                )
                p += 4
                this.v2.xxh_update(
                    (input[p+1] << 8) | input[p]
                ,   (input[p+3] << 8) | input[p+2]
                )
                p += 4
                this.v3.xxh_update(
                    (input[p+1] << 8) | input[p]
                ,   (input[p+3] << 8) | input[p+2]
                )
                p += 4
                this.v4.xxh_update(
                    (input[p+1] << 8) | input[p]
                ,   (input[p+3] << 8) | input[p+2]
                )
            }
            p += 4
        } while (p <= limit)
    }

    if (p < bEnd)
    {
        // XXH_memcpy(this.memory, p, bEnd-p);
        if (isString) {
            this.memory += input.slice(p)
        } else if (isArrayBuffer) {
            this.memory.set( input.subarray(p, bEnd), this.memsize )
        } else {
            input.copy( this.memory, this.memsize, p, bEnd )
        }

        this.memsize = bEnd - p
    }

    return this
}

/**
 * Finalize the XXH computation. The XXH instance is ready for reuse for the given seed
 * @method digest
 * @return {UINT32} xxHash
 */
XXH.prototype._digest = function () {
    var input = this.memory
    var isString = typeof input == 'string'
    var p = 0
    var bEnd = this.memsize
    var h32, h
    var u = new UINT32

    if (this.total_len >= 16)
    {
        h32 = this.v1.rotl(1).add( this.v2.rotl(7).add( this.v3.rotl(12).add( this.v4.rotl(18) ) ) )
    }
    else
    {
        h32  = this.seed.add( PRIME32_5 )
    }

    h32.add( u.fromNumber(this.total_len) )

    while (p <= bEnd - 4)
    {
        if (isString) {
            u.fromBits(
                (input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
            ,   (input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
            )
        } else {
            u.fromBits(
                (input[p+1] << 8) | input[p]
            ,   (input[p+3] << 8) | input[p+2]
            )
        }
        h32
            .add( u.multiply(PRIME32_3) )
            .rotl(17)
            .multiply( PRIME32_4 )
        p += 4
    }

    while (p < bEnd)
    {
        u.fromBits( isString ? input.charCodeAt(p++) : input[p++], 0 )
        h32
            .add( u.multiply(PRIME32_5) )
            .rotl(11)
            .multiply(PRIME32_1)
    }

    h = h32.clone().shiftRight(15)
    h32.xor(h).multiply(PRIME32_2)

    h = h32.clone().shiftRight(13)
    h32.xor(h).multiply(PRIME32_3)

    h = h32.clone().shiftRight(16)
    h32.xor(h)

    // Reset the state
    this.init( this.seed )

    return h32
}

XXH.prototype.digest = function() {
    return this._digest().toNumber();
}

XXH.prototype.digestHex = function () {
    return this._digest().toString();
}

XXH.digest = function (input, seed) {
    XXH(input, seed).toNumber();
};

XXH.digetsHex = function (input, seed) {
    XXH(input, seed).toString();
};

return XXH;
})();
''';
