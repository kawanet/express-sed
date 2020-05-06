"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zlib_1 = require("zlib");
const util_1 = require("util");
const textType = {
    "javascript": 1,
    "json": 1,
    "text": 1,
    "utf-8": 1,
    "x-javascript": 1,
    "xml": 1,
};
const removeHeaders = {
    "if-match": 1,
    "if-modified-since": 1,
    "if-none-match": 1,
    "if-unmodified-since": 1,
    "range": 1,
};
const decoders = {
    gzip: util_1.promisify(zlib_1.gunzip),
    deflate: util_1.promisify(zlib_1.inflate),
};
function sed(transform) {
    if ("string" === typeof transform) {
        return sed(parse(transform));
    }
    return (req, res, next) => {
        let ended = false;
        const queue = [];
        const _write = res.write;
        const _end = res.end;
        const _method = req.method;
        const isHEAD = (_method === "HEAD");
        if (isHEAD)
            req.method = "GET";
        Object.keys(removeHeaders).forEach(key => delete req.headers[key]);
        res.write = function (chunk, encoding, cb) {
            if (ended)
                return false;
            cb = enqueue([].slice.call(arguments));
            if (cb)
                cb();
            return true;
        };
        res.end = function (chunk, encoding, cb) {
            if (ended)
                return false;
            ended = true;
            cb = enqueue([].slice.call(arguments));
            sendBody(this, queue).then(() => {
                _end.call(this);
            }, err => {
                res.status(500);
                _end.call(this);
                return err;
            }).then(cb);
        };
        next();
        function enqueue(item) {
            let cb;
            if ("function" === typeof item[item.length - 1])
                cb = item.pop();
            if (item[0])
                queue.push(item);
            return cb;
        }
        async function sendBody(res, items) {
            const type = res.get("Content-Type");
            if (isText(type)) {
                items = await applyTransform(res, items);
            }
            if (!isHEAD)
                items.forEach(item => _write.apply(res, item));
        }
    };
    async function applyTransform(res, items) {
        const buffers = items.map(item => item[0]).filter(chunk => chunk);
        const source = await getBodyString(res, buffers);
        const text = transform(source) || "";
        const data = Buffer.from(text);
        res.set("Content-Length", (+data.length) + "");
        var etagFn = res.app && res.app.get('etag fn');
        if ("function" === typeof etagFn) {
            res.set("ETag", etagFn(data));
        }
        return [[data]];
    }
    async function getBodyString(res, buffers) {
        const stringLength = buffers.filter(chunk => "string" === typeof chunk).length;
        if (stringLength === buffers.length) {
            return buffers.join("");
        }
        buffers = buffers.map(chunk => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        let buffer = Buffer.concat(buffers);
        buffer = await uncompressBody(res, buffer);
        return buffer.toString();
    }
    async function uncompressBody(res, buffer) {
        const contentEncoding = res.getHeader("content-encoding");
        const transferEncoding = res.getHeader("transfer-encoding");
        const decoder = decoders[contentEncoding] || decoders[transferEncoding];
        if (decoder && buffer.length) {
            buffer = await decoder(buffer);
            res.removeHeader("content-encoding");
            res.removeHeader("transfer-encoding");
        }
        return buffer;
    }
}
exports.sed = sed;
function isText(type) {
    if (type)
        return !!type.split(/[\/\;\s\+=]+/).filter(v => !!textType[v.toLowerCase()]).length;
}
function parse(str) {
    let regexp, replace;
    if (str && str[0] === "s") {
        const sep = str[1];
        const list = [""];
        let idx = 0;
        str.split(/(\\.|[^\\])/).forEach(str => {
            if (str === sep) {
                list[++idx] = "";
            }
            else {
                list[idx] += str;
            }
        });
        if (idx === 3) {
            regexp = new RegExp(list[1], list[3]);
            replace = list[2];
        }
    }
    if (!regexp) {
        throw new SyntaxError("Invalid transform: " + str);
    }
    return (str) => {
        if (str)
            return str.replace(regexp, replace);
    };
}
