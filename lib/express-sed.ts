// express-sed.ts

import * as express from "express";
import {gunzip, inflate} from "zlib";
import {promisify} from "util";

type replaceFn = (str: string) => string;
type chunkItem = [string | Buffer, any?, any?];
type numMap = { [type: string]: number };
type decoderFn = (buffer: Buffer) => Promise<Buffer>;
type callbackFn = (err?: Error) => void;

const textType: numMap = {
    "javascript": 1,
    "json": 1,
    "text": 1,
    "utf-8": 1, // ; charset=UTF-8
    "x-javascript": 1,
    "xml": 1,
};

const removeHeaders: numMap = {
    "if-match": 1,
    "if-modified-since": 1,
    "if-none-match": 1,
    "if-unmodified-since": 1,
    "range": 1,
};

const decoders = {
    gzip: promisify(gunzip),
    deflate: promisify(inflate),
} as { [encoding: string]: decoderFn };

export function sed(transform: (string | replaceFn)): express.RequestHandler {
    if ("string" === typeof transform) {
        return sed(parse(transform));
    }

    return (req, res, next) => {
        let ended = false;
        const queue: chunkItem[] = [];
        const _write = res.write;
        const _end = res.end;

        const _method = req.method;
        const isHEAD = (_method === "HEAD");
        if (isHEAD) req.method = "GET";

        // remove conditional request headers
        Object.keys(removeHeaders).forEach(key => delete req.headers[key]);

        res.write = function (chunk: any, encoding?: any, cb?: callbackFn) {
            if (ended) return false;
            cb = enqueue([].slice.call(arguments));
            if (cb) cb();
            return true;
        };

        res.end = function (chunk?: any, encoding?: any, cb?: callbackFn) {
            if (ended) return false;
            ended = true;
            cb = enqueue([].slice.call(arguments));

            sendBody(this, queue).then(() => {
                _end.call(this);
            }, err => {
                res.status(500);
                _end.call(this);
                return err;
            }).then(cb);
        }

        next();

        function enqueue(item: chunkItem): callbackFn {
            let cb: callbackFn;
            if ("function" === typeof item[item.length - 1]) cb = item.pop();
            if (item[0]) queue.push(item);
            return cb;
        }

        async function sendBody(res: express.Response, items: chunkItem[]) {
            const type = res.get("Content-Type");

            if (isText(type)) {
                items = await applyTransform(res, items);
            }

            if (!isHEAD) items.forEach(item => _write.apply(res, item));
        }
    };

    async function applyTransform(res: express.Response, items: chunkItem[]): Promise<chunkItem[]> {
        const buffers = items.map(item => item[0]).filter(chunk => chunk);

        // concatenate
        const source = await getBodyString(res, buffers);

        // replace response body
        const text = (transform as replaceFn)(source) || "";

        // string to Buffer
        const data = Buffer.from(text);

        // Content-Length:
        res.set("Content-Length", (+data.length) + "");

        // ETag:
        var etagFn = res.app && res.app.get('etag fn')
        if ("function" === typeof etagFn) {
            res.set("ETag", etagFn(data));
        }

        return [[data]];
    }

    async function getBodyString(res: express.Response, buffers: (string | Buffer)[]): Promise<string> {
        const stringLength = buffers.filter(chunk => "string" === typeof chunk).length;

        // shortcut when only string chunks given and no Buffer chunks mixed
        if (stringLength === buffers.length) {
            return buffers.join("");
        }

        // force Buffer
        buffers = buffers.map(chunk => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

        // concat Buffer
        let buffer = Buffer.concat(buffers as Buffer[]);

        // uncompress Buffer
        buffer = await uncompressBody(res, buffer);

        // Buffer to string
        return buffer.toString();
    }

    async function uncompressBody(res: express.Response, buffer: Buffer): Promise<Buffer> {
        const contentEncoding = res.getHeader("content-encoding") as string;
        const transferEncoding = res.getHeader("transfer-encoding") as string;
        const decoder = decoders[contentEncoding] || decoders[transferEncoding];

        if (decoder && buffer.length) {
            buffer = await decoder(buffer);
            res.removeHeader("content-encoding");
            res.removeHeader("transfer-encoding");
        }

        return buffer;
    }
}

/**
 * detect text content type
 * @private
 */

function isText(type: string): boolean {
    if (type) return !!type.split(/[\/\;\s\+=]+/).filter(v => !!textType[v.toLowerCase()]).length;
}

/**
 * parse s/match/replace/g
 * @private
 */

function parse(str: string): replaceFn {
    let regexp: RegExp, replace: string;

    if (str && str[0] === "s") {
        const sep = str[1];
        const list: string[] = [""];
        let idx: number = 0;

        str.split(/(\\.|[^\\])/).forEach(str => {
            if (str === sep) {
                list[++idx] = "";
            } else {
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
        if (str) return str.replace(regexp, replace);
    };
}
