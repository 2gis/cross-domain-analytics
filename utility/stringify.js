'use strict';

//  KEYS encoding removed, be careful!

const ARRAY = [];
const getProto = Object.getPrototypeOf;
const oProto = getProto({});

const encQS = value => encodeURI(value).replace(/[#&=]/g, c => '%' + c.charCodeAt(0).toString(16));
const encXWF = value => encodeURIComponent(value).replace(/[!'()~]/g, c => '%' + c.charCodeAt(0).toString(16)).replace(/%20/g, '+');

exports.qsStringify = objStringify.bind(null, encQS);
exports.xwfStringify = objStringify.bind(null, encXWF);

const isObject = (obj, proto) =>
    Array.isArray(obj) ? true
        : (obj === null || typeof obj !== 'object') ? false
        : (proto = getProto(obj), proto === oProto || proto === null);

function objStringify (enc, obj) {
    if (obj === null || typeof obj !== 'object') {
        throw new TypeError('the obj to stringify must be an object');
    }
    let keys = Object.keys(obj);
    let len = keys.length;
    let array = ARRAY;
    let stack = [];
    let ret = [];
    let cur = obj;
    let keyPrefix = '';
    let key, value, i;

    for (i = 0; i < len; ++i) {
        key = keys === array ? i : keys[i];
        value = cur[key];
        if (isObject(value)) {
            stack.push(keyPrefix, cur, keys, len, i);

            if (keyPrefix === '') {
                keyPrefix = key;
            } else {
                keyPrefix = keyPrefix + '[' + key + ']';
            }

            if (Array.isArray(value)) {
                keys = array;
                len = value.length;
            } else {
                keys = Object.keys(value);
                len = keys.length;
            }
            i = -1;
            cur = value;
        }
        else {
            if (typeof value !== 'string') {
                value = '' + value;
            }

            let serializedKey = keyPrefix === ''
                ? key
                : keyPrefix + '[' + key + ']';
            ret.push(serializedKey + '=' + enc(value));
        }

        if (i === len - 1 && stack.length > 0) {
            i = stack.pop();
            len = stack.pop();
            keys = stack.pop();
            cur = stack.pop();
            keyPrefix = stack.pop();
        }
    }

    return ret.join('&');
}
