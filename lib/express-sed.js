"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sed = void 0;
const express_intercept_1 = require("express-intercept");
const sed_lite_1 = require("sed-lite");
const defaults = {
    method: /^(?!HEAD)/,
    contentType: /^text|json|javascript|svg|xml|utf-8/i,
};
const removeRange = express_intercept_1.requestHandler().getRequest(req => delete req.headers.range);
function sed(replacer, options) {
    if (!options)
        options = {};
    if ("function" !== typeof replacer) {
        replacer = sed_lite_1.sed(replacer);
    }
    if (!replacer) {
        throw new SyntaxError("Invalid transform: " + replacer);
    }
    const method = options.method || defaults.method;
    const contentType = options.contentType || defaults.contentType;
    const replaceHandler = express_intercept_1.responseHandler()
        .if(res => contentType.test(res.getHeader("Content-Type")))
        .replaceString(replacer);
    return express_intercept_1.requestHandler()
        .for(req => method.test(req.method))
        .use(removeRange, replaceHandler);
}
exports.sed = sed;
