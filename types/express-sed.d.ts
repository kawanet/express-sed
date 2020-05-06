import { RequestHandler } from "express";
declare type Replacer = (str: string) => string | Promise<string>;
export interface SedOptions {
    method?: RegExp | string;
    contentType?: RegExp | string;
}
export declare function sed(replacer: (string | Replacer), options?: SedOptions): RequestHandler;
export {};
