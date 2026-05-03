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
    // Match every method by default. HEAD is routed through the empty-body
    // branch in `sed()` so the upstream's pre-replace ETag / Content-Length
    // get stripped instead of leaking through unchanged.
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
    // do for HEAD is delete the upstream's stale ETag / Content-Length so
    // they stop disagreeing with the same resource served via GET.
    //
    // `replaceBuffer(_ => Buffer.of())` always reaches express-intercept's
    // `setBuffer(empty)` codepath, which removes both headers in one shot
    // (Content-Length goes away when the buffer is empty, and ETag is
    // removed unless an `etag fn` is configured at the app level, in
    // which case it gets recomputed against the empty body).
    const stripHeadBody = responseHandler().replaceBuffer(_ => Buffer.of());
    const headChain = requestHandler().use(stripHeadBody, replaceHandler);

    const methodRouter = (req: any, res: any, next: any) =>
        (req.method === "HEAD") ? headChain(req, res, next) : replaceHandler(req, res, next);

    return requestHandler()
        .for(req => !method || method.test(req.method))
        .use(removeRange, methodRouter);
};
