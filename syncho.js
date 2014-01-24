(function () {
  "use strict";
  var Fiber = require('fibers'), PAUSE = 1000;

  function Sync (fn) {
    Fiber(fn).run();
  }

  Sync.Fiber = Fiber;

  Function.prototype.sync = function sync (thisArg, args) {
    return this.future.apply(this, arguments).wait();
  };

  Function.prototype.future = function future (thisArg, args) {
    var fn = this, fiber = Fiber.current, resolved = false, yielded = false, future = {}, args = [];
    for (var i = 1, l = arguments.length; i < l; i++)
      args[i-1] = arguments[i];
    args.push(resolve);
    fn.apply(thisArg, args);

    future.wait = function () {
      if (! resolved) {
        try {
          future.result =  produce();
        }
        catch (err) {
          future.error = err;
        }
      }
      if (future.error)
        throw future.error;
      else
        return future.result;
    };

    function resolve (err, res) {
      if (resolved) return;
      if (err && ! (err instanceof Error)) err = new Error(err);
      resolved = true;
      if (yielded) {
        process.nextTick(function () {
          if (err) {
            fiber.run(err);
          } else {
            fiber.run(res);
          }
        });
      } else {
        future.error = err;
        future.result = res;
      }
    }

    function produce () {
      yielded = true;
      var res = Fiber.yield();
      if (res instanceof Error) throw res;
      else return res;
    }
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
    }
  };

  function sleep (ms) {
    (function (ms, cb) {
      setTimeout(cb, ms);
    }).sync(null, ms || PAUSE)
  }

  Sync.sleep = sleep;

  function middleware () {
    return function middleware (req, res, next) {
      Sync(next);
    }
  }

  Sync.middleware = middleware;

  module.exports = Sync;

})();
