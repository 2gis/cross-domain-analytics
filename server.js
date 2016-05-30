'use strict';

const ping = {};
const fs = require('fs');
const url = require('url');
const http = require('http');
const cookies = require('./cookies');
const config  = require('./config');
const wrappers = require('./wrappers');
const recvBody = wrappers.recvBody;
const sendBody = wrappers.sendBody;
const fork = require('child_process').fork;

const projects = config.projects.map(project => ({
        cookieName: 'cid_' + project.prefix,
        imagePath: '/' + project.image,
        imageData: fs.readFileSync('./' + project.image),
        prefix: project.prefix,
        ua: project.UA
    })
);


const server = http.createServer();
server.on('connection', (socket) => {
    //  We're dealing with very small (less than 64KB) responses
    //  So we don't need additional Nagle's delay on a sending half
    socket.setNoDelay(true);
});
server.on('request', (req, res) => {
    let urlObj,
        cookie,
        reqPath,
        project,
        remoteIP;

    let status = 200,
        expBodyLen = 0;

    //  We support 'GET' method only and incoming body is meaningless for us
    //  but specs allow non-empty bodies in requests in such case
    //  so have to proceed with this in mind

    //  Process body headers
    //  The logic is relatively complex, see 'rfc7230#section-3.3' for details
    if (req.headers['transfer-encoding']) {
        expBodyLen = -1;
        if (req.headers['transfer-encoding'] !== 'chunked' ||
            req.headers['content-length']) status = 400;
    } else if (req.headers['content-length']) {
        expBodyLen = parseInt(req.headers['content-length'], 10);
        if (isNaN(expBodyLen) || expBodyLen < 0 ) status = 400;
    }

    //  Check for supported HTTP method
    if (req.method !== 'GET') {
        status = 405;
        res.setHeader('Allow', 'GET');
    }

    //  Check for valid URL
    if ('string' === typeof req.url && req.url.length < 2083) {
        urlObj = url.parse(req.url, true);
        reqPath = urlObj.pathname ? urlObj.pathname.toLowerCase() : '';
        project = projects.find(project => project.imagePath === reqPath);
        if (!project) status = 404;
    } else {
        status = 414;
    }

    if (status < 400 ) {
        //  Get cookies
        cookie = cookies.parse(req.headers.cookie);
        let cid = cookie[project.cookieName];
        if (!cid || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(cid)) {
            cid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
                (c, r) => (r = Math.random() * 16 | 0, (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)));
            res.setHeader('Set-Cookie', cookies.serialize(project.cookieName, cid));
        }
        //  TODO: check for API parameters
        let analytic = {
            v: config.apiVersion,
            tid: project.ua,
            cid: cid,
            uip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',', 1)[0],
            ua: req.headers['user-agent'] || '',

            t: 'pageview',
            an: project.prefix,
            dr: req.headers['referer'] || '',
            sr: (urlObj.query || {}).sr || ''
        };
        child.send(analytic);

        recvBody(req, expBodyLen)
            .then(status => sendBody(res, status, project.imageData))
            .catch(err => {/* req.connection.destroy() */});
    } else {
        sendBody(res, status, null)
            .catch(err => {/* req.connection.destroy() */});
    }

    // console.log(require('util').inspect(req, {showHidden: true, depth: 1, maxArrayLength: 0}));
    // res.end();

    //  req.socket === req.connection === req.client === res.socket === res.connection
});


//  Child maintenance block
let child;

function onMessage (msg) {
    if (msg === null) {
        if (!server.lisnening) {
            let port = 3000;
            server.listen(port).lisnening = true;   //  remove in Node.js v6.0+
            console.log(`Server listening on port ${port}`);
        }
    }
}
function onError (err) {
    switch (err.message) {
        case 'channel closed': reSpawn(); break;
        default: console.log(`Child error (unknown reason): ${err.message}`);
    }
}
function onExit (code, signal) {
    //
}

function reSpawn (escape) {
    if (child) child
        .removeListener('exit', onExit)
        .removeListener('error', onError)
        .removeListener('message', onMessage);

    if (!escape) child = fork('./worker')
        .on('message', onMessage)
        .on('error', onError)
        .on('exit', onExit);
}

reSpawn();


setInterval(() => {
    console.log(process.memoryUsage());
}, 5000);
