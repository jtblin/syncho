// see https://github.com/0ctave/node-sync/issues/29
(function () {
  "use strict";
  var async = require('async')
    , n = 10000
    , fs = require('fs')
    ;

  function asyncFn (file, cb) {
    // using fs.stat as too many timeouts/nextTick affect benchmark
    fs.stat(file, cb);
  }

  function runAsync (file) {
    return function (cb) {
      asyncFn(file, cb);
    }
  }

  var Sync = require('../syncho');
  Sync(function () {

    function syncFastFn (file) {
      return asyncFn.sync(null, file);
    }

    var asyncSyncFastFn = syncFastFn.async();
    console.time('syncho');
    for (var i = 0, batch = []; i < n; i++) {
      batch.push(asyncSyncFastFn.future(null, 'package.json'));
    }
    for (var i = 0; i < n; i++) {
      batch[i].wait();
    }
    console.timeEnd('syncho');

    console.time('async.parallel');
    for (var i = 0, batch = []; i < n; i++) {
      batch.push(runAsync('package.json'));
    }
    async.parallel(batch, function (err, res) {
      console.timeEnd('async.parallel');
      next();
    });

  });

  function next () {
    var Sync = require('sync');
    Sync(function () {

      function syncFn (file) {
        return asyncFn.sync(null, file);
      }

      var asyncSyncFn = syncFn.async(), r;
      console.time('sync');
      for (var i = 0, batch = []; i < n; i++) {
        batch.push(asyncSyncFn.future(null, 'package.json'));
      }
      for (var i = 0; i < n; i++) {
        r = batch[i].result;
      }
      console.timeEnd('sync');
    });
  }
})();
