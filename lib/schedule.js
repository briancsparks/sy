
const {hostname}          = require('os');
const {_setRoute53_}      = require('./ip-utils');
const _now                = require('lodash/now');

module.exports.runLoop = runLoop;

// TODO: allow Ctrl+C

// var start = _now();
var start = 0;
async function runLoop() {
  var ok,ip,changed;

  if (_now() - start > 10000) {
    [ok,ip,changed] = await _setRoute53_(hostname(), 'briancsparks.net');

    if (!ok) {
      // Do not reset start so we run again in one more second
      return setTimeout(runLoop, 1000);
    }
  }

  start = _now();
  return setTimeout(runLoop, 1000);
}

