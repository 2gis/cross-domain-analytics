'use strict';

const pong = {};
const http = require('http');
const config  = require('./config.json');
const xwfEncode = require('./stringify').xwfStringify;

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
        let request = http.request({hostname: '10.154.18.99', port: 5000, method: 'POST', path: config.path, headers: headers});
        request.write(msg);
        request.end();
        // console.log(require('util').inspect(request));
    }
});

process.send(null);   //  Child is OK, init listening
