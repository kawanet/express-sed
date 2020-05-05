// express-sed.ts

import * as express from "express";

type replaceFn = (str: string) => string;
type chunkItem = [string | Buffer, any, any];

const textType = {
    "javascript": 1,
    "json": 1,
    "text": 1,
    "utf-8": 1, // ; charset=UTF-8
    "x-javascript": 1,
    "xml": 1,
} as { [type: string]: number };

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

        res.write = function (chunk: any, encoding?: any, cb?: any) {
            if (ended) return false;

            const args = [].slice.call(arguments);
            if ("function" === typeof args[args.length - 1]) cb = args.pop();
            queue.push(args);
            if (cb) cb();

            return true;
        };

        res.end = function (chunk?: any, encoding?: any, cb?: any) {
            if (ended) return false;
            ended = true;

            // chunk argument could be omitted
            let args = [].slice.call(arguments);
            if ("function" === typeof args[args.length - 1]) cb = args.pop();
            if (args[0]) queue.push(args);
            args = cb ? [cb] : [];

            const type = this.get("Content-Type");
            if (isText(type)) {
                // Concatenate
                let text = queue.map(item => item[0]).filter(chunk => chunk).join("");

                // Replace response body
                text = transform(text) || "";
                const data = Buffer.from(text);
                if (!isHEAD) args.unshift(data);

                // Content-Length:
                this.set("Content-Length", (+data.length) + "");

                // ETag:
                var etagFn = this.app && this.app.get('etag fn')
                if ("function" === typeof etagFn) {
                    this.set("ETag", etagFn(data));
                }
            } else if (!isHEAD) {
                // ignore binary content
                queue.forEach(item => _write.apply(this, item));
            }

            return _end.apply(this, args);
        }

        next();
    };
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
