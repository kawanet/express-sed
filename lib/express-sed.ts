// express-sed.ts

import {RequestHandler} from "express";
import {requestHandler, responseHandler} from "express-intercept";

type Replacer = (str: string) => string | Promise<string>;
type Tester = { test: (str: string) => boolean };

export interface SedOptions {
    /// HTTP request method: regexp or forward match string
    method?: RegExp | string;

    /// HTTP response Content-Type: regexp or forward match string
    contentType?: RegExp | string;
}

const defaults: SedOptions = {
    // skip when HEAD method per default
    method: /^(?!HEAD)/,

    // detect text-ish types per default
    contentType: /^text|json|javascript|svg|xml|utf-8/i,
};

const makeTester = (cond: RegExp | string): Tester => !cond ? {test: () => true} : (cond as RegExp).test ? (cond as RegExp) : {test: str => !String(str).indexOf(cond as string)};

const removeRange = requestHandler().getRequest(req => delete req.headers.range);

export function sed(replacer: (string | Replacer), options?: SedOptions): RequestHandler {
    if (!options) options = {} as SedOptions;

    if ("function" !== typeof replacer) {
        const fn = parse(replacer);
        if (!fn) throw new SyntaxError("Invalid transform: " + replacer);
        return sed(fn, options);
    }

    const method = makeTester(options.method || defaults.method);

    const contentType = makeTester(options.contentType || defaults.contentType);

    const replaceHandler = responseHandler()
        .if(res => contentType.test(res.getHeader("Content-Type") as string))
        .replaceString(replacer);

    return requestHandler()
        .for(req => method.test(req.method))
        .use(removeRange, replaceHandler);
}

/**
 * parse s/match/replace/g
 * @private
 */

function parse(str: string): Replacer {
    if (str && str[0] === "s") {
        const sep = str[1];
        const list: string[] = [""];
        let idx: number = 0;

        str.split(/(\\.|[^\\])/).forEach(str => {
            if (str === sep) {
                list[++idx] = "";
            } else if (str) {
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
