(function () {
  "use strict";
  var Sync = require('../sync')
    , async = require('async')
    , sync = require('synchronize')
    , t = 0, n = 10000, count = 0
    , asyncSeries = []
    ;

  var fs = {
    stat: function (file, cb) {
      this.setTimeout(file, cb);
    },
    setTimeout: function (file, cb) {
      setTimeout(function () { cb(null, 'file: ' + file)}, t);
    }
  };

  function asyncFn (cb) {
    fs.stat('./package.json', function (err, res) {
      cb(null, res);
    })
  }

  testSync();

  function testSync () {

    Sync(function() {

      for (var i = 0; i < n; i++) {
        asyncSeries.push(asyncFn);
      }

      var results = [];
      console.time('synchronize');
      sync(fs, 'stat');
      for (var i = 0; i < n; i++) {
        results.push(fs.stat('./package.json'));
      }
      console.timeEnd('synchronize');

      results = [];
      console.time('sync-fast');
      for (var i = 0; i < n; i++) {
        results.push(fs.stat.sync(fs, './package.json'));
      }
      console.timeEnd('sync-fast');

      results = [];
      require('sync');
      console.time('sync');
      for (var i = 0; i < n; i++) {
        results.push(fs.stat.sync(fs, './package.json'));
      }
      console.timeEnd('sync');

      results = [];
      require('fibrous');
      console.time('fibrous');
      for (var i = 0; i < n; i++) {
        results.push(fs.sync.stat('./package.json'));
      }
      console.timeEnd('fibrous');

      var Fiber = require('fibers');
      results = [];
      console.time('fibers');
      var fiber = Fiber.current;
      for (var i = 0; i < n; i++) {
        fs.stat('./package.json', function (err, res) {
          fiber.run(res);
        });
        results.push(Fiber.yield());
      }
      console.timeEnd('fibers');

      var Future = require('fibers/future'), futureAsync = Future.wrap(fs.stat.bind(fs), 1);
      results = [];
      console.time('future');
      for (var i = 0; i < n; i++) {
        results.push(futureAsync('./package.json').wait());
      }
      console.timeEnd('future');

      results = [];
      console.time('async.series');
      async.series(asyncSeries, function (err, res) {
        results = res;
        console.timeEnd('async.series');

        trueAsync();
      });

      function trueAsync () {
        var results = [];
        console.time('asyncFn');
        runAsync ();
        function runAsync () {
          asyncFn(function (err, res) {
            results.push(res);
            if (++count === n) console.timeEnd('asyncFn');
            else runAsync();
          });
        }
      }


    });
  }


})();
