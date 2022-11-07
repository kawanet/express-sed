#!/usr/bin/env mocha -R spec

import * as fs from "fs";
import * as express from "express";
import * as request from "supertest";

import {sed} from "../";

const TITLE = __filename.split("/").pop();

const documentRoot = __dirname + "/htdocs";
const stringFn = (src: string) => src.replace(/(sample)/g, "[$1]");
const binaryFn = (src: string) => src.replace(/(GIF|PNG)/, "[$1]");

describe(TITLE, () => {

    const textFiles = [
        "/sample.css",
        "/sample.html",
        "/sample.js",
        "/sample.json",
        "/sample.txt",
        "/sample.xml",
    ];

    const binaryFiles = [
        "/empty.gif",
        "/empty.png",
    ];

    describe("text content without sed", () => {
        textFiles.forEach(path => {
            it(path, () => {
                const app = express();
                app.use(express.static(documentRoot));
                const body = fs.readFileSync(documentRoot + path, "utf8");
                return request(app).get(path).expect(body);
            });
        });
    });

    describe("text content transformed with sed", () => {
        textFiles.forEach(path => {
            it(path, () => {
                const app = express();
                app.use(sed(stringFn));
                app.use(express.static(documentRoot));
                const body = fs.readFileSync(documentRoot + path, "utf8");
                return request(app).get(path).expect(stringFn(body));
            });
        });
    });

    describe("binary content ignored even with sed", () => {
        binaryFiles.forEach(path => {
            it(path, () => {
                const app = express();
                app.use(sed(binaryFn));
                app.use(express.static(documentRoot));
                const body = fs.readFileSync(documentRoot + path, null);
                return request(app).get(path).buffer(true).parse(concatParser).expect(body);
            });
        });
    });
});

/**
 * superagent parser to concatenate chunked response body
 */

function concatParser(res: NodeJS.ReadableStream, fn: any) {
    const data: Buffer[] = [];
    res.on("data", chunk => data.push(chunk));
    res.on("end", () => fn(null, Buffer.concat(data)));
}
