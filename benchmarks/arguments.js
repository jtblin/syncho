(function () {
  "use strict";
  var a = [], n = 1000000, testCases = [];

  function proto () {
    var args = Array.prototype.slice.call(arguments, 1);
    args.push(1);
    return args;
  }

  function forLoop () {
    var args = [];
    for (var i = 1, l = arguments.length; i < l; i++)
      args.push(arguments[i]);
    args.push(1);
    return args;
  }

  function nativeArguments () {
    if (arguments.length) {
      for (var i = 1, l = arguments.length; i < l; i++)
        arguments[i-1] = arguments[i];
      arguments[arguments.length-1] = 1;
    } else {
      arguments[arguments.length++] = 1;
    }
    return arguments;
  }

  console.time('proto');
  for (var i = 0; i < n; i++) {
    a = proto.apply(null, testCases);
  }
  console.timeEnd('proto');

  console.time('forLoop');
  for (var i = 0; i < n; i++) {
    a = forLoop.apply(null, testCases);
  }
  console.timeEnd('forLoop');

  console.time('nativeArguments');
  for (var i = 0; i < n; i++) {
    a = nativeArguments.apply(null, testCases);
  }
  console.timeEnd('nativeArguments');

})();
