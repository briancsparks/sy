
const path  = require('path');

module.exports.lookupSubCommands = function(name) {

  // If all else fails, just use the identity
  var modFname  = path.join(__dirname, `${name}.js`);
  var fnName    = name;
  var known     = false;

  switch (name || '~~none~~') {
    case 'mod-tests':
    case 'mk-mod-tests':
    case 'mk-module-tests':
    case 'make-module-tests':
      modFname  = path.join(__dirname, `mk-module-tests.js`);
      fnName    = 'mkModuleTests';
      known     = true;
      break;
  }

  return {known, modFname, fnName};
};
