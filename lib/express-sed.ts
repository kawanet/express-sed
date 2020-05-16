// express-sed.ts

import {RequestHandler} from "express";
import {requestHandler, responseHandler} from "express-intercept";
import {sed as parse} from "sed-lite";

type Replacer = (str: string) => string | Promise<string>;

export interface SedOptions {
    /// HTTP request method: regexp or forward match string
    method?: RegExp | { test: (str: string) => boolean };

    /// HTTP response Content-Type: regexp or forward match string
    contentType?: RegExp | { test: (str: string) => boolean };
}

const defaults: SedOptions = {
    // skip when HEAD method per default
    method: /^(?!HEAD)/,

    // detect text-ish types per default
    contentType: /^text|json|javascript|svg|xml|utf-8/i,
};

const removeRange = requestHandler().getRequest(req => delete req.headers.range);

export function sed(replacer: (string | Replacer), options?: SedOptions): RequestHandler {
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
