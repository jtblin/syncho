(function () {

    var t = 0, n = 10000, i
    , results = []
    ;

  function asyncFn (i, cb) {
    setTimeout(function () {
      cb(null, 'foo' + i);
    }, t);
  }

  var fs = {
    stat: function (file, cb) {
      this.setTimeout(file, cb);
    },
    setTimeout: function (file, cb) {
      setTimeout(function () { cb(null, 'file: ' + file)}, t);
    }
  };

  var Sync = require('../syncho');
  Sync(function () {

    console.time('syncho-simple');
    for (i = 0; i < n; i++) {
      results.push(asyncFn.sync(null, i));
    }
    console.timeEnd('syncho-simple');

    results = [];
    console.time('syncho-object');
    for (i = 0; i < n; i++) {
      results.push(fs.stat.sync(fs, 'package.json'));
    }
    console.timeEnd('syncho-object');

  });

//  var thunk = require('thunkify'), co = require('co');
//  co(function *() {
//
//    results = [];
//    console.time('co-simple');
//    for (i = 0; i < n; i++) {
//      var fn = thunk(asyncFn);
//      results.push(yield fn(i));
//    }
//    console.timeEnd('co-simple');
//
//    results = [];
//    console.time('co-object');
//    for (i = 0; i < n; i++) {
//      var stat = thunk(fs.stat.bind(fs));
//      results.push(yield stat('package.json'));
//    }
//    console.timeEnd('co-object');
//
//  })();

})();
