
const {hostname}          = require('os');
const {setRoute53}        = require('../lib/ip-utils');

var express = require('express');
var router = express.Router();

/* GET. */
router.get('/setlocalipdns', function(req, res, next) {

  doit();
  async function doit() {
    var ok,ip;

    [ok,ip] = await setRoute53(hostname(), 'briancsparks.net');

    res.send(JSON.stringify({ok: true}));
  }
});

module.exports = router;
