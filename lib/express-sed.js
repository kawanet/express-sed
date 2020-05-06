"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_intercept_1 = require("express-intercept");
const defaults = {
    method: /^(?!HEAD)/,
    contentType: /^text|json|javascript|svg|xml|utf-8/i,
};
const makeTester = (cond) => !cond ? { test: () => true } : cond.test ? cond : { test: str => !String(str).indexOf(cond) };
const removeRange = express_intercept_1.requestHandler().getRequest(req => delete req.headers.range);
function sed(replacer, options) {
    if (!options)
        options = {};
    if ("function" !== typeof replacer) {
        const fn = parse(replacer);
        if (!fn)
            throw new SyntaxError("Invalid transform: " + replacer);
        return sed(fn, options);
    }
    const method = makeTester(options.method || defaults.method);
    const contentType = makeTester(options.contentType || defaults.contentType);
    const replaceHandler = express_intercept_1.responseHandler()
        .if(res => contentType.test(res.getHeader("Content-Type")))
        .replaceString(replacer);
    return express_intercept_1.requestHandler()
        .for(req => method.test(req.method))
        .use(removeRange, replaceHandler);
}
exports.sed = sed;
function parse(str) {
    if (str && str[0] === "s") {
        const sep = str[1];
        const list = [""];
        let idx = 0;
        str.split(/(\\.|[^\\])/).forEach(str => {
            if (str === sep) {
                list[++idx] = "";
            }
            else if (str) {
                list[idx] += str;
            }
        });
        if (idx === 3) {
            const regexp = new RegExp(list[1], list[3]);
            const replace = list[2];
            return (str) => {
                return str.replace(regexp, replace);
            };
        }
    }
}
