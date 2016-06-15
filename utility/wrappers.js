'use strict';

const STATUS_CODES = require('http').STATUS_CODES;

const maxAcceptedBodyLength = 10 * 1024;
exports.maxAcceptedBodyLength = maxAcceptedBodyLength;

exports.recvBody = (req, expBodyLen) => new Promise((resolve, reject) => {
    let received = 0;

    function onReadable () {
        let buf = req.read();
        received += buf ? buf.length : 0;

        if (expBodyLen !== 0) {
            if (expBodyLen < 0 && received <= maxAcceptedBodyLength ||
                received <= expBodyLen && received <= maxAcceptedBodyLength) {
            } else {
                req.emit('end'); //  Body too large!
            }
        } else if (received > 0) {
            req.emit('end');    //  Hmm... what we are doing here?!
        }
    }

    function onEnd () {
        process.nextTick(clearEvents);

        if (expBodyLen !== 0) {
            if (expBodyLen < 0 && received <= maxAcceptedBodyLength ||
                received === expBodyLen && received <= maxAcceptedBodyLength) {
                resolve(200);   //  Correct body received
            } else {
                resolve(413);   //  Body too large
            }
        } else {
            if (received === 0) {
                resolve(200);   //  No message Body present
            } else {
                resolve(411);   //  Message Body present, but we are not waiting for it
            }
        }
    }

    function onError (err) {
        process.nextTick(clearEvents);

        reject(err);
    }

    function clearEvents () {
        req
            .removeListener('end', onEnd)
            .removeListener('error', onError)
            .removeListener('readable', onReadable);
    }

    req
        .on('readable', onReadable)
        .on('error', onError)
        .on('end', onEnd);
});

exports.sendBody = (res, status, body) => new Promise((resolve, reject) => {
    res.statusCode = status;

    if (status < 400) {
        //  This app sends only png images
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', body.length);
    } else {
        //  Error condition. Respond with Error code.
        body = new Buffer(status + ': ' + (STATUS_CODES[status] || 'Unknown Error'));
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', body.length);
    }

    function onFinish () {
        process.nextTick(clearEvents);
        resolve();
    }

    function onCloseOrError () {
        process.nextTick(clearEvents);
        reject();
    }

    function clearEvents () {
        res
            .removeListener('close', onCloseOrError)
            .removeListener('error', onCloseOrError)
            .removeListener('finish', onFinish);
    }

    res
        .on('finish', onFinish)
        .on('error', onCloseOrError)
        .on('close', onCloseOrError);

    //  There is nothing to do special if 'body' is a empty buffer or string
    res.end(body);
});

exports.request = (req, msg) => new Promise((resolve, reject) => {
    function onFinish () {
        process.nextTick(clearEvents);
        resolve();
    }

    function onError () {
        process.nextTick(clearEvents);
        reject();
    }

    function clearEvents () {
        req
            .removeListener('error', onError)
            .removeListener('finish', onFinish);
    }

    req
        .on('finish', onFinish)
        .on('error', onError);

    req.setNoDelay(true);
    req.end(msg);
});
