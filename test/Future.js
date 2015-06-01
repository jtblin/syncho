describe('Future', function () {

  var sandbox, future;
  var sinon = require("sinon");
  var Fiber = require('fibers');
  var Sync = require('../index');
  var Future = require('../lib/Future');

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    future = new Future;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('resolve', function () {

    it('should set result and error', Sync.wrap(function () {
      future.resolve(null, true);
      future.result.should.be.true;
      future.resolved.should.be.true;
      expect(future.error).to.be.null;
    }));

    it('should run the fiber with the result when fiber was yielded', Sync.wrap(function (done) {
      var fiber = { run: function (res) { res.should.be.true;}};
      future.fiber = fiber;
      future.yielded = true;
      future.resolve(null, true);
      future.resolved.should.be.true;
    }));

    it('should run the fiber with the error when fiber was yielded', Sync.wrap(function (done) {
      var fiber = { run: function (res) { res.should.be.an.instanceOf(Error);}};
      future.fiber = fiber;
      future.yielded = true;
      future.resolve(new Error);
      future.resolved.should.be.true;
    }));

    it('should not run the fiber when the future is already resolved', Sync.wrap(function () {
      var nextTick = process.nextTick;
      process.nextTick = function (fn) { fn() };
      var fiber = { run: function (res) { chai.assert.fail(true, false, 'Fiber should not have been run') }};
      future.fiber = fiber;
      future.yielded = true;
      future.resolved = true;
      future.resolve(null, true);
      process.nextTick = nextTick;
    }));

    it('should set error as an Error', Sync.wrap(function () {
      future.resolve('Something went wrong');
      future.error.should.be.an.instanceOf(Error);
    }));

    it('should not leak the fiber', Sync.wrap(function () {
      future.resolve(null, true);
      expect(future.fiber).to.be.null;
    }));
  });

  describe('wait', function () {

    it('should call produce to get the results', Sync.wrap(function () {
      var mock = sandbox.mock(future);
      mock.expects('produce').once().returns(true);
      future.wait().should.be.true;
      mock.verify();
    }));

    it('should call produce and throws the error', Sync.wrap(function () {
      var mock = sandbox.mock(future);
      mock.expects('produce').once().throws(new Error('Something went wrong...'));
      expect(future.wait.bind(future)).to.throw('Something went wrong...');
      mock.verify();
    }));

    it('should not call produce when the future is already resolved', Sync.wrap(function () {
      var mock = sandbox.mock(future);
      mock.expects('produce').never();
      future.resolved = true;
      future.result = true;
      future.wait().should.be.true;
      mock.verify();
    }));

    it('should not call produce and should throw an error', Sync.wrap(function () {
      var mock = sandbox.mock(future);
      mock.expects('produce').never();
      future.resolved = true;
      future.error = new Error('Something went wrong...');
      expect(future.wait.bind(future)).to.throw('Something went wrong...');
      mock.verify();
    }));

    it('should not leak the fiber', Sync.wrap(function () {
      sandbox.stub(future, 'produce').returns(true);
      future.wait();
      expect(future.fiber).to.be.null;
    }));
  });

  describe('produce', function () {

    it('should yield the fiber and returns the result', Sync.wrap(function () {
      var mock = sandbox.mock(Fiber);
      mock.expects('yield').once().returns(true);
      var Future = require('../lib/Future'), future = new Future;
      future.produce().should.be.true;
      mock.verify();
    }));

    it('should yield the fiber and throws the error', Sync.wrap(function () {
      var mock = sandbox.mock(Fiber);
      mock.expects('yield').once().returns(new Error('Something went wrong...'));
      expect(future.produce.bind(future)).to.throw('Something went wrong...');
      mock.verify();
    }));

    it('should yield the fiber and marks the future as yielded', Sync.wrap(function () {
      var mock = sandbox.mock(Fiber);
      mock.expects('yield').once().returns(true);
      future.produce().should.be.true;
      future.yielded.should.be.true;
      mock.verify();
    }));
  });

});

