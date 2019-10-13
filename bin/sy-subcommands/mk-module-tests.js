
const sg                      = require('sg-clihelp');
const { sh }                  = sg;
const {
  test
}                             = sh;

module.exports.mkModuleTests = function(argv) {
  var   packageDir    = process.cwd();

  if (!test('-f', sg.path.join(packageDir, 'package.json')))            { return sg.die(`Cannot find package.json at ${packageDir}`); }               /* || die */

  var   m           =  sg.from(packageDir, 'package.json', 'name').match(/([a-z0-9_-]+)$/i);
  if (!m)                                                               { return sg.die(`Cannot find 'name' in package.json`); }                      /* || die */

  const packageName     =  m[1];
  const cleanPkgName    = packageName.replace(/[^a-zA-Z0-9_]/g, '_');
  const testFname       =  sg.path.join(packageDir, '__test__', `${packageName}.test.js`);

  sh.mkdir('-p', '__test__');

  sh.ShellString(`
const ${cleanPkgName}     = require('..');
const test                    = require('ava');

test('works', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};
  // const result    = echo(a);
  const result    = a;

  t.deepEqual(result, [{a:'foo', b:'bar', d:{e:'all'}}]);
});`)
  .to(testFname);
};

