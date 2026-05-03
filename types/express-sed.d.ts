import type {RequestHandler} from "express";

export declare type Replacer = (str: string) => string | Promise<string>;

export declare interface SedOptions {
    /// HTTP request method: regexp or forward match string.
    /// `null` (the default) matches every method. HEAD requests are
    /// promoted to GET internally so the resulting Content-Length stays
    /// consistent with the equivalent GET response.
    method?: RegExp | { test: (str: string) => boolean } | null;

    /// HTTP response Content-Type: regexp or forward match string
    contentType?: RegExp | { test: (str: string) => boolean };
}

export declare const sed: (replacer: (string | Replacer), options?: SedOptions) => RequestHandler;
