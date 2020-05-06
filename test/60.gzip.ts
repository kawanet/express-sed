#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

import {gzip, deflate} from "zlib";
import {promisify} from "util";

import {sed} from "../lib/express-sed";

const TITLE = __filename.split("/").pop();

const encoders = {
    gzip: promisify(gzip),
    deflate: promisify(deflate),
} as any;

describe(TITLE, () => {
    const agent = getAgent();

    test("/without-sed/gzip", "sample:gzip");
    test("/without-sed/deflate", "sample:deflate");
    test("/with-sed/gzip", "[SAMPLE]:gzip");
    test("/with-sed/deflate", "[SAMPLE]:deflate");

    function test(path: string, expected: string) {
        it(path, () => {
            return agent.get(path).expect(expected);
        });
    }
});

function getAgent() {
    const app = express();
    app.get("/without-sed/:encoding", sampleAPI());
    app.use(sed("s/sample/[SAMPLE]/g"));
    app.get("/with-sed/:encoding", sampleAPI());
    return request(app);
}

function sampleAPI(): express.RequestHandler {
    return async (req, res, next) => {
        const encoding = req.params.encoding;
        const body = "sample:" + encoding;
        let buffer = Buffer.from(body);

        const encoder = encoders[encoding];
        if (encoder) buffer = await encoder(buffer);

        res.status(200);
        res.header("Content-Type", "text/plain");
        res.header("Content-Encoding", encoding);
        res.header("Content-Length", "" + buffer.length);

        // chunked response body
        [].map.call(buffer, (byte: number) => res.write(Buffer.from([byte])));

        res.end();
    };
}
