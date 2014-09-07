describe('Sync', function () {

  var Sync = require('../index');

  function asyncFn (cb) {
    process.nextTick(function () {
      cb(null, 'foo');
    });
  }

  function asyncFnError (cb) {
    process.nextTick(function () {
      cb('Error foo');
    });
  }

  function syncFn () {
    return asyncFn.sync() + 'bar';
  }

  function asyncFnImmediate (cb) {
      cb(null, 'foo');
  }

  function asyncFnErrorImmediate (cb) {
      cb('Error foo');
  }

  function asyncFnWithArgs (a, b, cb) {
    process.nextTick(function () {
      cb(null, a+b);
    });
  }

  function asyncFnMultiCb (cb) {
    process.nextTick(function () {
      cb(null, 1);
      cb(null, 2);
    });
  }

  var asyncObj = {
    echo: function (text, cb) {
      this.asyncEcho(text, cb);
    },
    asyncEcho: function (text, cb) {
      process.nextTick(function () { cb(null, text)});
    }
  };

  function verifyFiberIsRunning () {
    var fiber = Sync.Fiber.current;
    expect(fiber).to.exist;
    fiber.started.should.equal(true);
  }

  it('should run the fiber', function () {
    Sync(verifyFiberIsRunning);
    var middleware = Sync.middleware();
    middleware({}, {}, verifyFiberIsRunning);
  });

  it('should return the result', function () {
    Sync(function () {
      asyncFn.sync().should.equal('foo');
      asyncFnImmediate.sync().should.equal('foo');
      asyncFnWithArgs.sync(null, 2, 3).should.equal(5);
      asyncObj.echo.sync(asyncObj, 'Hello').should.equal('Hello');
      asyncFnMultiCb.sync().should.equal(1);
    });
  });

  it('should throw an error', function () {
    Sync(function () {
      var fn = function () { asyncFnError.sync(); };
      expect(fn).to.throw('Error foo');
      fn = function () { asyncFnErrorImmediate.sync(); };
      expect(fn).to.throw('Error foo');
    });
  });

  it('should make the synced function async', function (done) {
    Sync(function () {
      var async = syncFn.async();
      async(function (err, res) {
        res.should.equal('foobar');
        done();
      });
    });
  });

  it('should return the result in the future', function () {
    Sync(function () {
      var future = asyncFn.future();
      future.wait().should.equal('foo');
    });
  });

  it('should throw an error in the future', function () {
    Sync(function () {
      var future = asyncFnError.future();
      var fn = function () { future.wait(); };
      expect(fn).to.throw('Error foo');
    });
  });

  it('should sleep', function () {
    Sync(function () {
      var start = new Date;
      Sync.sleep(100);
      expect(new Date - start).to.be.closeTo(100, 5);
    });
  });

  it('should wrap the function in a Fiber', function () {
    var fn = function () {
      var start = new Date;
      Sync.sleep(100);
      expect(new Date - start).to.be.closeTo(100, 5);
    }.wrap();
    fn();
  });

});
