'use strict';

const dns = require('dns');
const http = require('http');
const config  = require('./config.json');
const request = require('./utility/wrappers').request;
const xwfEncode = require('./utility/stringify').xwfStringify;

let hosts, interval;

process.on('message', (msg) => {
    if (msg === null) {
        process.exit();
    } else {
        msg = xwfEncode(msg);
        let headers = {
            'Host': config.hostname,
            'User-Agent': config.useragent,
            'Accept': '*/*',
            'Accept-Language': 'en-US',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': msg.length.toString(10)
        };
        let host = hosts.length > 1 ? hosts[Math.floor(Math.random() * hosts.length)] : hosts[0];
        let req = http.request({hostname: host, family: 4, method: 'POST', path: config.path, headers: headers});
        request(req, msg).then(() => {console.log('Request sent')}).catch((err) => {console.log('Request error')});
    }
});

function resolver () {
    dns.resolve4(config.hostname, (err, addresses) => {
        if (!err && addresses.length > 0) {
            if (!hosts) setupInterval();
            hosts = addresses;
        } else {
            dns.lookup(config.hostname, {family: 4, all: true}, (err, addresses) => {
                if (!err && addresses.length > 0) {
                    if (!hosts) setupInterval();
                    hosts = addresses.map(obj => obj.address);
                } else {
                    //  Something wrong with DNS
                    if (!hosts && !interval) {
                        console.log(`Could not resolve '${config.hostname}' hostname.\nPlease, check DNS service while we keep trying...\n`);
                        interval = setInterval(resolver, 10 * 1000);
                    }
                }
            });
        }
    });
}

function setupInterval () {
    if (interval) clearInterval(interval);
    interval = setInterval(resolver, 3600 * 1000).unref();
    process.send(null); //  Worker initialized
}

resolver();
