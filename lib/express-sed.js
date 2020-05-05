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
        res.write = function (chunk) {
            if (ended)
                return false;
            const args = [].slice.call(arguments);
            queue.push(args);
            return true;
        };
        res.end = function (chunk, encoding, cb) {
            if (ended)
                return false;
            ended = true;
            const args = [].slice.call(arguments);
            if ("function" === typeof chunk) {
                args.unshift(null);
            }
            const type = this.get("Content-Type");
            if (isText(type)) {
                queue.push(args);
                let text = queue.map(item => item[0]).filter(chunk => chunk).join("");
                text = transform(text) || "";
                const data = args[0] = Buffer.from(text);
                this.set("Content-Length", (+data.length) + "");
                var etagFn = this.app && this.app.get('etag fn');
                if ("function" === typeof etagFn) {
                    this.set("ETag", etagFn(data));
                }
            }
            else if (!isHEAD) {
                queue.forEach(item => _write.apply(this, item));
            }
            if (isHEAD)
                args[0] = null;
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
