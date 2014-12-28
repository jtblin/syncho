(function () {
  "use strict";
  var Fiber = require('fibers'),
      extend = require('util')._extend;

  module.exports = Future;

  function Future () {
    this.fiber = Fiber.current;
    this.resolved = false;
    this.yielded = false;
  }

  Future.prototype.resolve = function (err, res) {
    var self = this;
    if (this.resolved) return;
    this.resolved = true;
    if (err && ! (err instanceof Error)) {
      if (typeof err === 'string')
        err = new Error(err);
      else if (typeof err === 'object')
        err = extend(new Error, err);
      if (! err.message) err.message = '[syncho] Unknown error captured';
    }
    if (this.yielded) {
      process.nextTick(function () {
        if (err) {
          self.fiber.run(err);
        } else {
          self.fiber.run(res);
        }
        self.fiber = null;
      });
    } else {
      this.error = err;
      this.result = res;
      this.fiber = null;
    }
  };

  Future.prototype.wait = function () {
    if (! this.resolved) {
      try {
        this.result =  this.produce();
      }
      catch (err) {
        this.error = err;
      }
    }
    this.fiber = null;
    var result = this.result, error = this.error;
    this.result = null;
    this.error = null;
    if (error)
      throw error;
    else
      return result;
  };

  Future.prototype.produce = function () {
    this.yielded = true;
    var res = Fiber.yield();
    if (res instanceof Error) throw res;
    else return res;
  };

})();