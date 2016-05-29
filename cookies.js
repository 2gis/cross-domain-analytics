'use strict';

const maxCookieStringLength = 4096;

const encode = require('querystring').escape;
const decode = require('querystring').unescape;

//  Serialize the a name value pair into a cookie string suitable for
//  http headers. An optional options object specified cookie parameters
//
//  serialize('foo', 'bar', { httpOnly: true }) -> "foo=bar; httpOnly"
exports.serialize = (name, val, opt) => {
    let pair = [name + '=' + encode(val)];
    opt = opt || {};

    if (opt.maxAge) pair.push("Max-Age=" + opt.maxAge);
    if (opt.domain) pair.push('Domain=' + opt.domain);
    if (opt.path) pair.push('Path=' + opt.path);
    if (opt.expires) pair.push('Expires=' + opt.expires.toUTCString());
    if (opt.httpOnly) pair.push('HttpOnly');
    if (opt.secure) pair.push('Secure');

    return pair.join('; ');
};

//  Parse the given cookie header string into an object
//  The object has the various cookies as keys(names) => values
function cookieSlowParse (str, obj) {
    let pairs = str.split(/[;,] */),
        eq_idx, key, val;

    pairs.forEach(pair => {
        eq_idx = pair.indexOf('=');
        if (eq_idx < 0) return;

        key = pair.substr(0, eq_idx).trim();
        val = pair.substr(++eq_idx, pair.length).trim();

        // quoted values
        if ('"' === val[0]) val = val.slice(1, -1);

        // only assign once
        if (undefined === obj[key]) obj[key] = decode(val);
    });

    return obj;
}

function cookieExtract (str, start, end) {
    if (start === end + 1) {
        return '';
    } else {
        return str.slice(trimForward(str, start), trimBackward(str, end) + 1);
    }
}

var trimForward = function (str, i) {
    let ch = str.charCodeAt(i);
    while (ch <= 32) ch = str.charCodeAt(++i);
    return i;
};

var trimBackward = function (str, i) {
    let ch = str.charCodeAt(i);
    while (ch <= 32) ch = str.charCodeAt(--i);
    return i;
};

exports.parse = function (str) {
    let dictionary = {};
    if (!str || str.length > maxCookieStringLength) return dictionary;

    let keyStart = 0,
        keyEnd = 0,
        valueStart = 0,
        valueEnd = 0,
        len = str.length;

    let valueMND = false,
        isQuote = false;

    let key, value;

    let i, j, k, ch;

    mainloop: for (i = 0; i < len; i++) {
        ch = str.charCodeAt(i);

        if (ch > 127) {
            return cookieSlowParse(str, dictionary);
        } else if (ch === 61) {
            keyEnd = i - 1;
            j = i + 1;
            ch = str.charCodeAt(j);
            while (ch === 32) {
                j++;
                ch = str.charCodeAt(j);
            }
            if (ch === 34) {
                j++;
                isQuote = true;
            }
            valueStart = j;
            for (; j < len; j++) {
                ch = str.charCodeAt(j);
                if (ch === 37) {
                    valueMND = true;
                } else if (ch === 59 || ch === 44) {
                    if (isQuote) {
                        k = trimBackward(str, j - 1);
                        valueEnd = k - 1;
                        if (valueEnd < valueStart) valueStart = valueEnd;
                    } else {
                        valueEnd = j - 1;
                    }

                    key = cookieExtract(str, keyStart, keyEnd);
                    value = cookieExtract(str, valueStart, valueEnd);
                    dictionary[key] = valueMND ? decode(value) : value;

                    i = j;
                    for (; j < len; j++) {
                        if (str.charCodeAt(j) !== 32) {
                            i = j - 1;
                            break;
                        }
                    }
                    keyEnd = keyStart = i + 1;
                    isQuote = false;
                    valueMND = false;
                    continue mainloop;
                }
            }

            if (isQuote) {
                k = trimBackward(str, j - 1);
                valueEnd = k - 1;
                if (valueEnd < valueStart) valueStart = valueEnd;
            } else {
                valueEnd = j - 1;
            }

            key = cookieExtract(str, keyStart, keyEnd);
            value = cookieExtract(str, valueStart, valueEnd);
            dictionary[key] = valueMND ? decode(value) : value;

            i = j;
        } else if (ch === 59 || ch === 44) {
            keyStart = i + 1;
        }
    }

    return dictionary;
};
