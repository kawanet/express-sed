// express-sed.ts
// Express middleware to transform response body via a sed-style replacer.

import {requestHandler, responseHandler} from "express-intercept"
import {sed as parse} from "sed-lite"
// Self-reference via the package name so that `tsc --noEmit` resolves
// these types through `package.json` `exports` — the same path an
// external consumer would take. If the `exports.types` mapping ever
// breaks, the build fails here.
import type * as types from "express-sed"

type SedOptions = types.SedOptions

const defaults = {
    // Match every method by default. HEAD requests are routed through
    // `headHandler` in `sed()` so the upstream's pre-replace ETag /
    // Content-Length get removed instead of leaking through unchanged.
    method: null,

    // Detect text-ish Content-Type values by default.
    contentType: /^text|json|javascript|svg|xml|utf-8/i,
} satisfies SedOptions

const removeRange = requestHandler().getRequest(req => delete req.headers.range)

export const sed: typeof types.sed = (replacer, options) => {
    if (!options) options = {} as SedOptions

    if ("function" !== typeof replacer) {
        replacer = parse(replacer)
    }

    if (!replacer) {
        throw new SyntaxError("Invalid transform: " + replacer)
    }

    const method = options.method || defaults.method

    const contentType = options.contentType || defaults.contentType

    const replaceHandler = responseHandler()
        .if(res => contentType.test(res.getHeader("Content-Type") as string))
        .replaceString(replacer)

    // For HEAD requests, the only job sed has is to delete the upstream's
    // stale `ETag` / `Content-Length` so they stop disagreeing with the
    // same resource served via GET. The body itself stays empty: the
    // upstream typically writes none (Express's `res.send` and `send` /
    // `serve-static` both short-circuit on `req.method === "HEAD"`) and
    // the HTTP server would discard anything we hand back anyway.
    //
    // The headers are removed directly with `res.removeHeader` so the
    // outcome does not depend on the app's `etag fn` setting (any path
    // through `setBuffer` would re-issue an `etag fn`-derived ETag for
    // the empty body, which is fresh but still incorrect).
    const headHandler = responseHandler()
        .for(req => req.method === "HEAD")
        .getResponse(res => {
            res.removeHeader("ETag")
            res.removeHeader("Content-Length")
        })

    return requestHandler()
        .for(req => !method || method.test(req.method))
        .use(removeRange, headHandler, replaceHandler)
}
