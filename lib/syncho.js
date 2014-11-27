(function () {
  "use strict";
  module.exports = Sync;

  var Fiber = require('fibers'), PAUSE = 1000;

  function Sync (fn) {
    Fiber(fn).run();
  }

  Sync.Fiber = Fiber;

  Function.prototype.sync = function sync (thisArg, args) {
    return this.future.apply(this, arguments).wait();
  };

  Sync.Future = require('./Future');

  Function.prototype.future = function future (thisArg, args) {
    var fn = this, args = [], future = new Sync.Future;
    for (var i = 1, l = arguments.length; i < l; i++)
      args[i-1] = arguments[i];

    args.push(future.resolve.bind(future));
    fn.apply(thisArg, args);

    return future;
  };

  Function.prototype.async = function async (cxt) {
    var fn = this;
    return function (/* arguments */) {
      var args = arguments, cb = args[args.length-1];
      if (typeof cb !== 'function') throw new Error('Must pass a callback function to async functions');
      delete args[--args.length];
      process.nextTick(function () {
        Sync(function () {
          try {
            cb(null, fn.apply(cxt, args));
          }
          catch (err) {
            cb(err);
          }
        });
      });
    };
  };

  Function.prototype.wrap = function () {
    var fn = this;
    return function () {
      var self = this, args = arguments;
      Sync(function () {
        fn.apply(self, args);
      });
    };
  };

  Function.prototype.wrapIt = function () {
    var fn = this;
    if (fn.length > 1) throw new Error('Unsupported number of arguments: ' + fn.length + ' for function ' + fn);
    return function (done) {
      if (! (done instanceof Function)) throw new Error('Wrong usage');
      var self = this;
      Sync(function () {
        var doneCalled = false;
        try {
          if (fn.length) {
            fn.call(self, function (err) {
              doneCalled = true;
              done(err);
            });
            return;
          } else {
            fn.call(self);
          }
        } catch (err) {
          if (doneCalled) throw err;
          else done(err);
          return;
        }
        done();
      });
    };
  };

  function sleep (ms) {
    (function (ms, cb) {
      setTimeout(cb, ms);
    }).sync(null, ms || PAUSE);
  }

  Sync.sleep = sleep;

  function middleware () {
    return function middleware (req, res, next) {
      Sync(next);
    };
  }

  Sync.middleware = middleware;

  function wrap (fn) {
    return function () {
      var args = arguments;
      Sync(function () {
        fn.apply(fn, args);
      });
    };
  }

  Sync.wrap = wrap;

})();
