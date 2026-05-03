// express-sed.ts
// Express middleware to transform response body via a sed-style replacer.

import {requestHandler, responseHandler} from "express-intercept";
import {sed as parse} from "sed-lite";
// Self-reference via the package name so that `tsc --noEmit` resolves
// these types through `package.json` `exports` — the same path an
// external consumer would take. If the `exports.types` mapping ever
// breaks, the build fails here.
import type * as types from "express-sed";

type SedOptions = types.SedOptions;

const defaults: SedOptions = {
    // Skip the HEAD method by default.
    method: /^(?!HEAD)/,

    // Detect text-ish Content-Type values by default.
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
};
