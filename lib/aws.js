
const sg                      = require('sg-clihelp');
const AWS                     = require('aws-sdk');

const awsConf                 = awsDefs();
const config_                 = {paramValidation:false, region:'us-east-1', ...awsConf};
const config                  = new AWS.Config(config_);
const ec2                     = new AWS.EC2(config);
const sts                     = new AWS.STS(config);

// console.log(`AWS`, sg.inspect({config,ec2,sts}));

// console.log(`
// ================================================================================================
// new AWS.Config(...):
//   .region: ${config.region}
// ================================================================================================
// ec2keys: ${Object.keys(ec2)} ${typeof ec2.allocateAddress}

// ${AWS.DocDB}
// `);

// console.log(AWS.DocDB);

// for (let k in AWS.DocDB.__super__._serviceMap) {
//   const v = AWS.DocDB.__super__._serviceMap[k];
//   console.log(k, typeof v, v);
// }
// // console.log(`AWS`, sg.inspect({AWS}));

// // for (let k in AWS) {
// //   console.log(k, typeof AWS[k]);
// // }
// console.log(`AWS`, sg.inspect({ag: new AWS.APIGateway(), just: AWS.APIGateway}));





function awsDefs() {
  const region      = 'us-east-1';
  var   sslEnabled=true, httpOptions={};

  let env_proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy;
  if (env_proxy) {
    sslEnabled  = false;
    httpOptions = {proxy: env_proxy};
  }

  var   defs        = { region };

  // TODO: Fix
  // if (localIp.startsWith('15')) {
  //   defs = { ...defs, sslEnabled, httpOptions };
  // }

  exports.options = defs;
}

