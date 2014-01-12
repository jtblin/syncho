(function () {
  "use strict";
  var Fiber = require('fibers'), PAUSE = 1000;

  function Sync (fn) {
    Fiber(fn).run();
  }

  Sync.Fiber = Fiber;

  Function.prototype.sync = function sync (thisArg, args) {
    // TODO: remove code duplication between sync and future
    if (arguments.length) {
      for (var i = 1, l = arguments.length; i < l; i++)
        arguments[i-1] = arguments[i];
    } else {
      arguments[arguments.length++] = null;
    }
    return harmonize(this, thisArg, arguments);
  };

  function harmonize (fn, obj, args) {
    var fiber = Fiber.current, resolved = false;
    if (! fiber) throw new Error('Must run in a fiber');
    args[args.length-1] = resolve;
    fn.apply(obj, args);
    return produce();

    function resolve (err, res) {
      if (resolved) return;
      resolved = true;
      process.nextTick(function () {
        if (err) {
          if (! (err instanceof Error)) err = new Error(err);
          fiber.run(err);
        } else {
          fiber.run(res);
        }
      });
    }
  }

  function produce () {
    var res = Fiber.yield();
    if (res instanceof Error) throw res;
    else return res;
  }

  Function.prototype.async = function async (cxt) {
    var fn = this;
    return function (/* arguments */) {
      var cb = arguments[arguments.length-1];
      delete arguments[--arguments.length];
      if (typeof cb !== 'function') throw new Error('Must pass a callback function to async functions');
      try {
        cb(null, fn.apply(cxt, arguments));
      }
      catch (err) {
        cb(err);
      }
    }
  };

  Function.prototype.future = function future (thisArg, args) {
    var fn = this, fiber = Fiber.current, resolved = false, yielded = false, future = {};
    // TODO: future object
    if (arguments.length) {
      for (var i = 1, l = arguments.length; i < l; i++)
        arguments[i-1] = arguments[i];
      arguments[arguments.length-1] = resolve;
    } else {
      arguments[arguments.length++] = resolve;
    }
    fn.apply(thisArg, arguments);

    future.wait = function () {
      if (! resolved) {
        yielded = true;
        // TODO: simplify
        try {
          future.result =  produce();
          return future.result;
        }
        catch (err) {
          future.error = err;
          throw err;
        }
      } else {
        if (future.error)
          throw future.error;
        else
          return future.result;
      }
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
    return future;
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