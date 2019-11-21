
const os                  = require('os');
// const fs                  = require('fs');
// const path                = require('path');
const util                = require('util');
const sg0                 = require('sg-argv');
const sg                  = sg0.merge(sg0, require('sg-env'));
const AWS                 = require('aws-sdk');
const moment              = require('moment');
const deepEqual           = require('deep-equal');
const deepClone           = require('rfdc');
const _now                = require('lodash/now');

const ENV = sg.ENV();

// console.log(`localip:`, localIp());
// setRoute53('sparksb', 'briancsparks.net');


module.exports.localIP      = localIp;
module.exports.setRoute53   = setRoute53;
module.exports._setRoute53_ = _setRoute53_;
module.exports.awsDefs      = awsDefs;

async function setRoute53(...args) {
  var ok,ip,sinceChanged;

  while (!ok) {
    [ok, ip, sinceChanged] = await _setRoute53_(...args);

    if (!ok)        { await sleep(1000); }
  }

  return [ok, ip, sinceChanged];
}

var   changedAt;
var   last;
async function _setRoute53_(subdomain_, domain_, ip_) {
  const subdomain             = subdomain_.toLowerCase();
  const domain                = domain_.toLowerCase();
  const ip                    = ip_ || localIp().localIp;

  if (ip !== last) {
    changedAt   = _now();
  } else {
    return [true, ip, (_now() - changedAt)];
  }
  last = ip;

  console.log(`At ${moment().format('llll')}; IP ${ip} (input IP: ${ip_})`);

  const route53               = new AWS.Route53(awsDefs());

  var ok = false;
  var hz;

  if (!ip)                  { return [ok, ip, (_now() - changedAt)]; }

  console.log(`Attempting to set IP ${ip} (input IP: ${ip_}) of ${subdomain}.${domain} in Route53.`);
  try {
    const {HostedZones} = hz = await route53.listHostedZonesByName({DNSName: domain}).promise();

    if (HostedZones.length > 0) {
      const zone = HostedZones[0];
      if (zone.Name === `${domain}.`) {
        const HostedZoneId = zone.Id;
        const ChangeBatch = changeBatch(subdomain, domain, ip);
        const {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();

        console.log(`change`, util.inspect({HostedZoneId, ChangeBatch, ChangeInfo}, {depth:null, color:true}));
        console.log(`At ${moment().format('llll')}: requesting change of "${subdomain}.${domain}" to  ${ip}`);

        const result = await route53.waitFor('resourceRecordSetsChanged', {Id: ChangeInfo.Id}).promise();

        console.log({result});
        console.log(`At ${moment().format('llll')}: changed "${subdomain}.${domain}" to  ${ip}`);
        console.log(`... or maybe you should    curl http://localhost:${5111}/control/setlocalipdns`);

        ok = true;
      }
    } else {
      console.error(`Did not find domain: ${domain}`);
    }
  } catch(err) {
    console.error(`Fail in _setRoute53_`, err);
    console.error(`Continuing`);
    return [ok, ip, (_now() - changedAt)];
    // process.exit(3);
  }

  if (!ok) {
    console.error(`Fail! Maybe use /setlocalipdns?`, util.inspect({AWS_PROFILE: process.env.AWS_PROFILE, domain, hz:{...hz, HostedZones: hz.HostedZones.map(z => z.Name)}}, {depth:null, colors:true}));
  }

  return [ok, ip, (_now() - changedAt)];
}

function changeBatch(subdomain, domain, ip) {
  return {
    Changes: [{
      Action: 'UPSERT',
      ResourceRecordSet: {
        Name: `${subdomain}.${domain}.`,
        ResourceRecords: [{Value:`${ip}`}],
        TTL: 30,
        Type: "A"
      }
    }],
  };
}

function awsDefs() {
  const {ip,ip2,networkType}  = localIp();

  var   defs = {
    region  : 'us-east-1'
  };

  // Network with WiFi
  if (ip2) {
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      defs.proxy        = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    }

    if (defs.proxy) {
      defs.sslEnabled   = false;
    }
  }

  return defs;
}

var   lastNetworkList;
function localIp() {

  var   result        = '';

  const ifaceList     = os.networkInterfaces();
  var   ifaceNames    = Object.keys(ifaceList);

  console.log(`networkInterfaces`, util.inspect({ifaceList}, null, {colors:true}));

  ifaceNames = ifaceNames.filter(name => ! (name.toLowerCase().startsWith('vethernet') && !name.toLowerCase().match(/primary virtual switch/i)));
  ifaceNames = ifaceNames.filter(name => !name.toLowerCase().startsWith('vmware'));
  ifaceNames = ifaceNames.filter(name => !name.toLowerCase().startsWith('virtualbox'));


  var   ifaces = ifaceNames.reduce((m, name) => {
    ifaceList[name].forEach(iface => {
      if (iface.family !== 'IPv4')        { return; }
      if (iface.internal)                 { return; }
      if (iface.cidr.startsWith('172'))   { return; }

      m.push({...iface, name});
    });

    return m;
  }, []);

  const managedIpRe = ENV.at('SY_MANAGED_NETWORK_RE') || /^1[56][.]/;
  const homeIpRe    = /^192[.]/;
  const cloudIpRe   = /^10[.]/;
  const secondIpRe  = /^10[.]/;

  const localIpRe   = ENV.at('SY_LOCAL_NETWORK_RE_0');
  const localIp2Re  = ENV.at('SY_LOCAL_NETWORK_RE_1');

  var networkType;      /* home, managed, etc. */
  var ip,ip2;
  var localIp1,localIp2;

  // var haveNet15 = false;
  // var haveNet   = false;
  // ifaces.forEach(iface => {
  //   if (iface.address.startsWith('15.'))            { console.log(`${iface.cidr}   ${iface.name}`); result += `export NETWORK_TYPE="net15"\n`; haveNet = haveNet15 = true; }
  //   else if (iface.address.startsWith('16.'))       { console.log(`${iface.cidr}   ${iface.name}`); result += `export NETWORK_TYPE="net15"\n`; haveNet = haveNet15 = true; }
  // });

  ifaces.forEach(iface => {
    if (iface.address.match(managedIpRe))                   { networkType = 'managed';    ip        = iface.address; }
    if (localIpRe && iface.address.match(localIpRe))        {                             localIp1  = iface.address; }
    if (localIp2Re && iface.address.match(localIp2Re))      {                             localIp2  = iface.address; }
  });

  if (!ip) {
    ifaces.forEach(iface => {
      if (iface.address.match(homeIpRe))            { networkType = 'home';       ip = iface.address; }
      if (iface.address.match(cloudIpRe))           { networkType = 'cloud';      ip = iface.address; }
    });
  }

  if (ip) {
    ifaces.forEach(iface => {
      if (iface.address.match(secondIpRe))          {                             ip2 = iface.address; }
    });
  }

  if (localIp2 && !localIp1) {
    localIp1  = localIp2;
    localIp2  = null;
  }

  if (!localIp1) {
    localIp1 = ip || ip2;
  }

  const networkList = {ip,ip2,localIp: localIp1,localIp2,networkType};

  if (!deepEqual(lastNetworkList, networkList)) {
    changedAt = _now();
  }
  lastNetworkList = deepClone(networkList);

  return networkList;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
