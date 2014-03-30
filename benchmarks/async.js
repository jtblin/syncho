(function () {
  "use strict";
  var fs = require('fs'), n = 10000, count = 0;

  function asyncFn (cb) {
    // using fs.stat as too many timeouts/nextTick affect benchmark
    fs.stat('package.json', cb);
  }

  var Sync = require('../lib/syncho');

  Sync(function () {
    function syncFastFn () {
      return asyncFn.sync();
    }

    console.time('syncho - make function async');
    for (var i = 0; i < n; i++) {
      syncFastFn.async();
    }
    console.timeEnd('syncho - make function async');

    var asyncSyncFastFn = syncFastFn.async();
    console.time('syncho - exec async functions');
    console.time('syncho - exec async functions - total');
    for (var i = 0; i < n; i++) {
      asyncSyncFastFn(function (err, res) {
        if (++count === n) {
          console.timeEnd('syncho - exec async functions - total');
          setImmediate(next);
        }
      });
    }
    console.timeEnd('syncho - exec async functions');

  });

  function next () {
    var Sync = require('sync');

    Sync(function () {

      function syncFn () {
        return asyncFn.sync();
      }

      console.time('sync - make function async');
      for (var i = 0; i < n; i++) {
        syncFn.async();
      }
      console.timeEnd('sync - make function async');

      var asyncSyncFn = syncFn.async();
      count = 0;
      console.time('sync - exec async functions');
      console.time('sync - exec async functions - total');
      for (var i = 0; i < n; i++) {
        asyncSyncFn(function () {
          if (++count === n) {
            console.timeEnd('sync - exec async functions - total');
          }
        });
      }
      console.timeEnd('sync - exec async functions');

    });
  }

})();
