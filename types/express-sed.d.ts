import { RequestHandler } from "express";
declare type Replacer = (str: string) => string | Promise<string>;
export interface SedOptions {
    method?: RegExp | {
        test: (str: string) => boolean;
    };
    contentType?: RegExp | {
        test: (str: string) => boolean;
    };
}
export declare function sed(replacer: (string | Replacer), options?: SedOptions): RequestHandler;
export {};
