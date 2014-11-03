xxhash.jsx
===========================================

Synopsis
---------------

JSX implementation of very fast hasing algorithm xxHash. It can use from any JavaScript environment (common.js(node.js), AMD, browser, etc).

This code is based on [Pierrec's js-xxhash](https://github.com/pierrec/js-xxhash).

Code Example
---------------

### Use from JSX

```js
import "xxhash.jsx";

class _Main {
    static function main(argv : string[]) : void
    {
        var seed = 0xabcd;
        // single line way
        var hashStr : string = StringXXH.digestHex('input string', seed);

        // flexible way
        var hhx = new StringXXH(seed);
        hhx.update('first input string');
        hhx.update('second input string');
        var hashNum : number = hhx.digest();
        // or 
        var hashStr2 : string = hhx.digestHex();
    }
}
```

### Use from node.js

```js
var xxhash = require('xxhash.common.js');
var fs = require('fs');

var buffer = fs.readFileSync('inputfile.txt');
var hash = xxhash.XXH.digestHex(buffer, 0xabcd);
console.log(hash);
```

### Use from require.js

```js
// use xxhash.amd.js
define(['xxhash'], function (xxhash) {
    var hash = xxhash.XXH.digest('input string', 0x1111);
});
```

### Use via global variables

```html
<script src="xxhash.global.js" type="text/javascript"></script>
<script type="text/javascript">
window.onload = function () {
    alert(XXH.digestHex('content', 0xabcd));
});
</script>
```

Installation
---------------

```sh
$ npm install xxhash.jsx
```

If you want to use this library from other JSX project, install like the following:

```sh
$ npm install xxhash.jsx --save-dev
```

API Reference for JS
--------------------

For JavaScript environment, it provides entrypoint "XXH". It provides static methods to calculate XXHASH.

### XXH.digest(input : string/ArrayBuffer, seed : number) : number

It returns calculated hash value as number.

### XXH.digestHex(input : string/ArrayBuffer, seed : number) : string

It returns calculated hash value as hex string.

API Reference for JSX
---------------------

In addition to XXH class, there are two classes in this module;

* class StringXXH
* class ArrayBufferXXH

All classes have same methods

### static function digest(input : inputtype,  seed : number) : number

It returns calculated hash value as number.

### static function digestHex(input : inputtype,  seed : number) : string

It returns calculated hash value as hex string.

### function constructor(seed : number)

Initialize hash calculator object.

### function update(input : inputtype) : self

Add input. This method can be called multipul times.

### function digest() : number

It returns calculated hash as number.

### function digestHex() : string

It returns calculated hash as string.

### function init(seed : number) : void

Initialize object content.

Development
-------------

## JSX

Don't be afraid [JSX](http://jsx.github.io)! If you have an experience of JavaScript, you can learn JSX
quickly.

* Static type system and unified class syntax.
* All variables and methods belong to class.
* JSX includes optimizer. You don't have to write tricky unreadalbe code for speed.
* You can use almost all JavaScript API as you know. Some functions become static class functions. See [reference](http://jsx.github.io/doc/stdlibref.html).

## Setup

To create development environment, call following command:

```sh
$ npm install
```

## Repository

* Repository: git://github.com/shibukawa.yoshiki/xxhash.jsx.git
* Issues: https://github.com/shibukawa.yoshiki/xxhash.jsx/issues

## Run Test

```sh
$ grunt test
```

## Build

```sh
$ grunt build
```

## Generate API reference

```sh
$ grunt doc
```

Author
---------

* shibukawa.yoshiki / shibukawa.yoshiki@gmail.com

License
------------

The MIT License (MIT)

Complete license is written in `LICENSE.md`.
