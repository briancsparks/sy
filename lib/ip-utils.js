
const os                  = require('os');
// const fs                  = require('fs');
// const path                = require('path');
const util                = require('util');
const AWS                 = require('aws-sdk');

// console.log(`localip:`, localIp());
// setRoute53('sparksb', 'briancsparks.net');


module.exports.localIP      = localIp;
module.exports.setRoute53   = setRoute53;
module.exports.awsDefs      = awsDefs;

async function setRoute53(subdomain, domain, ip_) {
  const ip                    = ip_ || localIp().ip;
  const route53               = new AWS.Route53(awsDefs());

  var ok = false;
  var hz;

  if (!ip)                  { return {ok, ip}; }

  try {
    const {HostedZones} = hz = await route53.listHostedZonesByName({DNSName: domain}).promise();

    if (HostedZones.length > 0) {
      const zone = HostedZones[0];
      if (zone.Name === `${domain}.`) {
        const HostedZoneId = zone.Id;
        const ChangeBatch = changeBatch(subdomain, domain, ip);
        const {ChangeInfo} = await route53.changeResourceRecordSets({HostedZoneId, ChangeBatch}).promise();

        console.log(`change`, util.inspect({HostedZoneId, ChangeBatch, ChangeInfo}, {depth:null, color:true}));
        const result = await route53.waitFor('resourceRecordSetsChanged', {Id: ChangeInfo.Id}).promise();
        console.log(`changed ${subdomain}.${domain} to ${ip}`);

        ok = true;
      }
    } else {
      console.error(`Did not find domain: ${domain}`);
    }
  } catch(err) {
    console.error(err);
    console.log(`Continuing`);
    return {ok, ip};
    // process.exit(3);
  }

  if (!ok) {
    console.error(`Fail!`, util.inspect({AWS_PROFILE: process.env.AWS_PROFILE, domain, hz:{...hz, HostedZones: hz.HostedZones.map(z => z.Name)}}, {depth:null, colors:true}));
  }

  return {ok, ip};
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

function localIp() {

  var   result        = '';

  const ifaceList     = os.networkInterfaces();
  var   ifaceNames    = Object.keys(ifaceList);

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

  const managedIpRe = /^1[56][.]/;
  const homeIpRe    = /^192[.]/;
  const cloudIpRe   = /^10[.]/;
  const secondIpRe  = /^10[.]/;

  var networkType;      /* home, managed, etc. */
  var ip,ip2;

  // var haveNet15 = false;
  // var haveNet   = false;
  // ifaces.forEach(iface => {
  //   if (iface.address.startsWith('15.'))            { console.log(`${iface.cidr}   ${iface.name}`); result += `export NETWORK_TYPE="net15"\n`; haveNet = haveNet15 = true; }
  //   else if (iface.address.startsWith('16.'))       { console.log(`${iface.cidr}   ${iface.name}`); result += `export NETWORK_TYPE="net15"\n`; haveNet = haveNet15 = true; }
  // });

  ifaces.forEach(iface => {
    if (iface.address.match(managedIpRe))           { networkType = 'managed';    ip = iface.address; }

    // if (iface.address.startsWith('15.'))            { console.log(`${iface.cidr}   ${iface.name}`); result += `export NETWORK_TYPE="net15"\n`; haveNet = haveNet15 = true; }
    // else if (iface.address.startsWith('16.'))       { console.log(`${iface.cidr}   ${iface.name}`); result += `export NETWORK_TYPE="net15"\n`; haveNet = haveNet15 = true; }
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

  return {ip,ip2,networkType};
}
