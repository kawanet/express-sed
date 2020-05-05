"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            const args = [].slice.call(arguments);
            if ("function" === typeof args[args.length - 1])
                cb = args.pop();
            queue.push(args);
            if (cb)
                cb();
            return true;
        };
        res.end = function (chunk, encoding, cb) {
            if (ended)
                return false;
            ended = true;
            let args = [].slice.call(arguments);
            if ("function" === typeof args[args.length - 1])
                cb = args.pop();
            if (args[0])
                queue.push(args);
            args = cb ? [cb] : [];
            const type = this.get("Content-Type");
            if (isText(type)) {
                let text = queue.map(item => item[0]).filter(chunk => chunk).join("");
                text = transform(text) || "";
                const data = Buffer.from(text);
                if (!isHEAD)
                    args.unshift(data);
                this.set("Content-Length", (+data.length) + "");
                var etagFn = this.app && this.app.get('etag fn');
                if ("function" === typeof etagFn) {
                    this.set("ETag", etagFn(data));
                }
            }
            else if (!isHEAD) {
                queue.forEach(item => _write.apply(this, item));
            }
            return _end.apply(this, args);
        };
        next();
    };
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
