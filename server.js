'use strict';

const fs = require('fs');
const url = require('url');
const http = require('http');
const cookies = require('./cookies');
const config  = require('./config');
const wrappers = require('./wrappers');
const recvBody = wrappers.recvBody;
const sendBody = wrappers.sendBody;

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
    } else {
        status = 414;
    }

    //  We don't support incoming content
    if (req.headers['content-type']) {
        status = 415;
    }

    if (status < 400 && project) {
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
            headers: {
                'User-Agent': req.headers['user-agent'] || ''
            },
            qs: {
                v: config.apiVersion,
                tid: project.ua,
                cid: cid,
                uip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',', 1)[0],
                ua: req.headers['user-agent'] || '',

                t: 'pageview',
                an: project.prefix,
                dr: req.headers['referer'] || '',
                sr: (urlObj.query || {}).sr || ''
            }
        };
        //sendAnalytic(analytic);
    } else {
        status = 404;
    }


    if (status < 400) {
        recvBody(req, expBodyLen)
            .then(status => sendBody(res, status, project.imageData))
            .catch(err => req.client.destroy());
    } else {
        sendBody(res, status, null)
            .catch(err => req.client.destroy());
    }

    // console.log(require('util').inspect(req, {showHidden: true, depth: 1, maxArrayLength: 0}));
    // res.end();

    //  req.socket === req.connection === req.client === res.socket === res.connection
});

server.listen(3000);
