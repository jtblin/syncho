(function () {
  "use strict";
  var Sync = require('../sync')
    , async = require('async')
    , sync = require('synchronize')
    , t = 0, n = 10000, i = 0, count = 0
    , results = [], asyncSeries = []
    ;

  function asyncFn (i, cb) {
    setTimeout(function () {
      cb(null, 'foo' + i);
    }, t);
  }

  function runAsync (i) {
    return function (cb) {
      asyncFn(i, cb);
    }
  }

  testSync();

  function testSync () {

    Sync(function() {

      for (i = 0; i < n; i++) {
        asyncSeries.push(runAsync(i));
      }

      console.time('synchronize');
      var syncFn = sync.syncFn(asyncFn);
      for (i = 0; i < n; i++) {
        results.push(syncFn(i));
      }
      console.timeEnd('synchronize');

      console.time('sync-fast');
      for (i = 0; i < n; i++) {
        results.push(asyncFn.sync(null, i));
      }
      console.timeEnd('sync-fast');

      console.time('sync-fast-future');
      for (i = 0; i < n; i++) {
        asyncFn.future(null, i).wait();
      }
      console.timeEnd('sync-fast-future');

      require('sync');
      console.time('sync');
      for (i = 0; i < n; i++) {
        results.push(asyncFn.sync(null, i));
      }
      console.timeEnd('sync');

      require('fibrous');
      console.time('fibrous');
      for (i = 0; i < n; i++) {
        results.push(asyncFn.sync(i));
      }
      console.timeEnd('fibrous');

      var Fiber = require('fibers'), Future = require('fibers/future'), futureAsync = Future.wrap(asyncFn);
      console.time('fibers');
      var fiber = Fiber.current;
      for (i = 0; i < n; i++) {
        setTimeout(function() {
          fiber.run('foo'+i);
        }, t);
        results.push(Fiber.yield());
      }
      console.timeEnd('fibers');

      console.time('future');
      for (i = 0; i < n; i++) {
        results.push(futureAsync(i).wait());
      }
      console.timeEnd('future');

      console.time('async.series');
      async.series(asyncSeries, function (err, res) {
        results = res;
        console.timeEnd('async.series');

        trueAsync();
      });

      function trueAsync () {
        console.time('asyncFn');
        runAsync ();
        function runAsync () {
          asyncFn(count, function (err, res) {
            results.push(res);
            if (++count === n) console.timeEnd('asyncFn');
            else runAsync();
          });
        }
      }
    });
  }

})();