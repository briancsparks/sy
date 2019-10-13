#!/usr/bin/env node

const sg                      = require('sg-argv');
const debugLib                = require('debug');
const {lookupSubCommands}     = require('./sy-subcommands/lookup');

const argv                    = require('minimist')(process.argv.slice(2));
const debug                   = debugLib('sy');

console.log(argv);
debugLib.enable('sy');

const main = function() {
  const {known, modFname, fnName} = lookupSubCommands(argv._[0]);
  if (!known) {
    console.error(`Error: command '${argv._[0]}' is not known`);
    process.exit(33);
  }

  return require(modFname)[fnName](argv);
};

main();


