// express-sed.ts

import {requestHandler, responseHandler} from "express-intercept";
import {sed as parse} from "sed-lite";
import type * as types from "../types/express-sed";

type SedOptions = types.SedOptions;

const defaults: SedOptions = {
    // skip when HEAD method per default
    method: /^(?!HEAD)/,

    // detect text-ish types per default
    contentType: /^text|json|javascript|svg|xml|utf-8/i,
};

const removeRange = requestHandler().getRequest(req => delete req.headers.range);

export const sed: typeof types.sed = (replacer, options) => {
    if (!options) options = {} as SedOptions;

    if ("function" !== typeof replacer) {
        replacer = parse(replacer);
    }

    if (!replacer) {
        throw new SyntaxError("Invalid transform: " + replacer);
    }

    const method = options.method || defaults.method;

    const contentType = options.contentType || defaults.contentType;

    const replaceHandler = responseHandler()
        .if(res => contentType.test(res.getHeader("Content-Type") as string))
        .replaceString(replacer);

    return requestHandler()
        .for(req => method.test(req.method))
        .use(removeRange, replaceHandler);
}
