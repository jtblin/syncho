[![NPM version](https://badge.fury.io/js/syncho.svg)](http://badge.fury.io/js/syncho)

# syncho

`syncho` is a thin and fast wrapper around [fibers](https://github.com/laverdet/node-fibers) for node.js.
The API is very similar to [node-sync](http://github.com/0ctave/node-sync)
but optimized to reduce overhead (see benchmarks) and in less than 100 lines of code.


## Usage

    npm install syncho

## API

### Sync(fn)

  Pass a function `fn` to run in a fiber. This is just a shortcut to `Fiber(fn).run()`.
  Synchronized functions will throw in case of error so you can use standard `try` and `catch`
  to run your code. All `syncho` methods need to be run inside a fiber.

```js
var Sync = require('syncho');

Sync(function (){
  try {
    // run code synchronously inside fiber
  }
  catch (e) {
    // handle error
  }
});
```

### Function.prototype.sync(thisArg, args)

  Execute an asynchronous function inside a fiber, and return the result or throw in case of error.
  Use the idiomatic `Function.prototype.call` signature where the first argument is the object you want
  to bind the function to, the others are the standard arguments of the function.

```js
var Sync = require('syncho');
var redis = require('redis');
var db = redis.createClient();

function asyncEcho (text, cb) {
  process.nextTick(function () {
    cb(null, text);
  });
}

function asyncError (text, cb) {
  process.nextTick(function () {
    cb('Too bad');
  });
}

Sync(function (){
  try {

    // simple aync function

    console.log('Before sync');
    console.log(asyncEcho.sync(null, 'Hello!'));
    console.log('After sync');

    // async function binding object

    db.set.sync(db, 'foo', 'bar');
    console.log(db.get.sync(db, 'foo'));

    // this will throw an error

    asyncError.sync(null, 'Hello!');

  }
  catch (e) {
    console.error(e);
  }
});
```

### Function.prototype.future(thisArg, args)

  Execute an asynchronous function asynchronously and return a future, an object with a unique `wait` function, which will
  return the result or throw an error when `wait` is called. Behind the scene, `Function.prototype.sync`
  is just a shortcut to `fn.future(...).wait()`. Futures can be used to execute code in parallel. Note that the function
  starts executing as soon as the future is created. When `wait` is called, if the asynchronous function
  has not returned results yet, then and only then it will `yield` the fiber, otherwise it will just return the result
  or throw.

```js
var fs = require('fs');

Sync(function (){
  try {

    var a = fs.stat.future(null, 'package.json');
    var b = fs.stat.future(null, '.gitignore');
    var c = fs.stat.future(null, 'README.md');

    console.log(a.wait().size);
    console.log(b.wait().size);
    console.log(c.wait().size);

  }
  catch (e) {
    console.error(e);
  }
});
```

### Function.prototype.async()

  Return a function that accepts a callback to run a synchronous function asynchronously. This can be useful to pass
  functions that use fibers to external APIs that are not fiber aware and need to run code asynchronously. You can
  also use this to make parallel executions of synchronous functions by calling the `future` method
  on the now asynchronous function.

```js
var Sync = require('syncho');
var redis = require('redis');
var db = redis.createClient();

function syncGet (key) {
  return db.get.sync(db, key);
}

Sync(function (){
  try {

    // Just putting some data
    db.set.sync(db, 'foo', 'bar');
    db.set.sync(db, 'bar', 'baz');
    db.set.sync(db, 'baz', 'foo');

    // making our sync function async
    var asyncGet = syncGet.async();

    // execute in parallel
    var foo = asyncGet.future(db, 'foo');
    var bar = asyncGet.future(db, 'bar');
    var baz = asyncGet.future(db, 'baz');

    console.log(foo.wait(), bar.wait(), baz.wait());

  }
  catch (e) {
    console.error(e);
  }
});
```

### Function.prototype.wrap()

  Wrap the function in a Fiber. Useful for events emitters and other functions that expect a function as an argument.


```js
   syncSubjectUnderTest().should.have.been.run.in.a.Fiber;
```

### Function.prototype.wrapIt()

  Wrap a function in a Fiber passing `done` callback for [mocha](https://github.com/mochajs/mocha) tests.

In setup.js

    var Sync = require('syncho');

In your tests:

```js
  it('runs the test in a fiber', function (done) {
    syncSubjectUnderTest().should.have.been.run.in.a.Fiber;
    done();
  }.wrapIt());
```

### Sync.Fiber(fn)

  Expose the original `Fiber` object in case you need it.

### Sync.sleep(ms)

  Sleep for number of milliseconds (default 1000).

```js
var Sync = require('syncho');

Sync(function (){
  try {

    console.time('sleep');
    Sync.sleep(100);
    console.timeEnd('sleep');

  }
  catch (e) {
    console.error(e);
  }
});
```

### Sync.middleware()

  Middleware for express. Run each request in a fiber so that you can easily use sync methods.

```js
var Sync = require('syncho');
var express = require('express'), app = express();
var fs = require('fs');

app.use(express.query());
app.use(Sync.middleware());

app.get('/', function (req, res) {
  var file = fs.readFile.sync(null, req.query.file);
  res.end(file);
});

app.listen(3000, function () {
  console.log('Express server listening on port 3000');
});
```

## Why `syncho` and comparison with other fibers abstraction modules

  Fibers are awesome. I am not going to discussed their value here as it has been thoroughly documented but going to focus
  on why a new module was needed when there is already a ton of existing abstractions.

  I really loved the simplicity of the `sync` module from @0ctave compared to the original `Future` abstraction
  and other `Fiber` modules but there are some performance issues especially with `Function.prototype.future` in
  the `sync` module and code like statistics that I think unnecessary (500 loc for `sync` vs 100 loc for `syncho`).
  As this isn't a fork of the `sync` module at all (code is written entirely from scratch) and is not 100% compatible
  with its API [1], it was better to create a brand new module.

  Compare the different APIs (based on code already running in a fiber for simplicity)

    // Raw fibers
    var Fiber = require('fibers');
    var fiber = Fiber.current;
    db.get('foo', function (err, res) {
      if (err) fiber.throw(err);
      else fiber.run(res);
    });
    Fiber.yield();

    // Future
    var Future = require('fibers/future');
    var future = Future.wrap(db.get.bind(db));
    var res = future('foo').wait();

    // synchronize
    var sync = require('synchronize');
    sync(db, 'get');
    var res = db.get('foo');

    // syncho
    var res = db.get.sync(db, 'foo'); // Sync only need to be required once in your project / module to run the code in the fiber

  Also note that `syncho` does not decorate the fiber or any of the objects or functions that you sync and the
  only additions are the methods added to `Function.prototype`.

  (1) API for futures is not compatible with the `sync` module due to the creation of multiple properties on each future
  which has quite an impact on performance. I chose a simple `wait` function as with Marcel's original future implementation.

### ES6 generators and coroutines

With ES6 generators and coroutines, Fibers may become obsolete but until there is a stable node version released
supporting them, the only way to run asynchronous code synchronously is using fibers. Also the `yield` and `*` keywords
are a bit intrusive and the `sync` API is still the more elegant IMO. It will be interesting to see benchmarks with
the stable version of node for comparison. At the moment (0.11.9), 'syncho' with fibers is faster than
[co](https://github.com/visionmedia/co) with ES6 generators.

    syncho-simple: 12647ms
    syncho-object: 12793ms
    co-simple: 13850ms
    co-object: 14643ms

## Benchmarks

NB: all the existing Fibers modules are in general pretty fast and the cost of fibers is marginal. The longer the IO takes,
the more marginal it becomes to the point of being insignificant.

TL;DR `syncho` is the fastest (from 5% to 50 times faster than `sync`) of all fibers modules on every benchmark, and almost
as fast as using asynchronous code except when running synchronous functions in parallel. It is even faster than using
the `async` module (I haven't tested other asynchronous control-flow modules) and often faster than using raw fibers directly.

### Simple function (10,000)

    synchronize: 12905ms
    syncho: 12750ms
    syncho-future: 12712ms
    sync: 13265ms
    fibrous: 14171ms
    fibers: 13074ms
    future: 14212ms
    async.series: 13181ms
    asyncFn: 12872ms

### Binding to an object (10,000)

    synchronize: 12939ms
    syncho: 12684ms
    sync: 13502ms
    fibrous: 14449ms
    fibers: 13381ms
    future: 14497ms
    async.series: 13322ms
    asyncFn: 12990ms

### Parallel processing with futures (100,000)

    sync-future: 8697ms
    syncho-future: 755ms
    async.parallel: 2331ms
    future: 2004ms

### Parallel processing of synced functions with async and futures (10,000)

    syncho: 486ms
    async.parallel: 307ms
    sync: 23981ms

## Contributions

Please open issues for bugs and suggestions in [github](https://github.com/jtblin/syncho/issues).
Pull requests with tests are welcome.

## Author

Jerome Touffe-Blin, [@jtblin](https://twitter.com/jtlbin), [About me](http://about.me/jtblin)

## License

syncho is copyright 2013 Jerome Touffe-Blin and contributors. It is licensed under the BSD license. See the include LICENSE file for details.
