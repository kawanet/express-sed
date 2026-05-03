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
    // Match every method by default. HEAD requests are routed through
    // `headHandler` in `sed()` so the upstream's pre-replace ETag /
    // Content-Length get removed instead of leaking through unchanged.
    method: null,

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

    // For HEAD requests there is no useful body to transform: the upstream
    // typically writes none (Express's `res.send` and `send`/`serve-static`
    // both check `req.method === "HEAD"` and short-circuit) and the HTTP
    // server discards anything we hand back. What sed actually needs to
    // do for HEAD is delete the upstream's stale `ETag` / `Content-Length`
    // so they stop disagreeing with the same resource served via GET.
    //
    // We strip the headers directly via `getResponse` rather than going
    // through `replaceBuffer(_ => Buffer.of())`. The `replaceBuffer` path
    // would land in `express-intercept`'s `setBuffer(empty)` which, when
    // an `etag fn` is configured (Express's default), sets `ETag` to the
    // weak hash of the empty body — that's a fresh but still incorrect
    // value (it advertises the empty body as the resource). Direct
    // `removeHeader` calls leave both headers absent, regardless of the
    // app's `etag fn` setting.
    const headHandler = responseHandler()
        .for(req => req.method === "HEAD")
        .getResponse(res => {
            res.removeHeader("ETag");
            res.removeHeader("Content-Length");
        });

    return requestHandler()
        .for(req => !method || method.test(req.method))
        .use(removeRange, headHandler, replaceHandler);
};
