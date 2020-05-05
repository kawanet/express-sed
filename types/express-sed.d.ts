import * as express from "express";
declare type replaceFn = (str: string) => string;
export declare function sed(transform: (string | replaceFn)): express.RequestHandler;
export {};
