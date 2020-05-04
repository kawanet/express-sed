import * as express from "express";
declare type replaceFn = (string: string) => string;
export declare function sed(transform: (string | replaceFn)): express.RequestHandler;
export {};
