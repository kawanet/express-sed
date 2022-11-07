import type {RequestHandler} from "express";

declare type Replacer = (str: string) => string | Promise<string>;

declare interface SedOptions {
    /// HTTP request method: regexp or forward match string
    method?: RegExp | { test: (str: string) => boolean };

    /// HTTP response Content-Type: regexp or forward match string
    contentType?: RegExp | { test: (str: string) => boolean };
}

export declare const sed: (replacer: (string | Replacer), options?: SedOptions) => RequestHandler;
