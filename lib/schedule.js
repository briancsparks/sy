
const {hostname}          = require('os');
const {setRoute53}        = require('./ip-utils');
const _now                = require('lodash/now');

module.exports.runLoop = runLoop;

// TODO: allow Ctrl+C

var start = _now();
async function runLoop() {
  var ok,ip;

  if (_now() - start > 10000) {
    ({ok,ip} = await setRoute53(hostname(), 'briancsparks.net'));

    if (!ok) {
      // Do not reset start
      return setTimeout(runLoop, 1000);
    }
  }

  start = _now();
  return setTimeout(runLoop, 1000);
}

