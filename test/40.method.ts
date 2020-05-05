#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";
import {strict as assert} from "assert";

import {sed} from "../lib/express-sed";

const TITLE = __filename.split("/").pop();

const documentRoot = __dirname + "/htdocs";

describe(TITLE, () => {
    const agent = getAgent();
    {
        const path = "/sample.txt";
        const expected = "[SAMPLE] text\n";

        it("GET " + path, async () => {
            const {header, text} = await agent.get(path);
            assert.equal(text, expected);
            assert.equal(header["content-length"], "" + expected.length);
        });

        it("HEAD " + path, async () => {
            const {header, text} = await agent.head(path);
            assert.equal(text, undefined);
            assert.equal(header["content-length"], "" + expected.length);
        });
    }

    {
        const path = "/api/";

        it("GET " + path, async () => {
            const {header, text} = await agent.get(path);
            const expected = "GET [SAMPLE]";
            assert.equal(text, expected);
            assert.equal(header["content-length"], "" + expected.length);
        });

        it("HEAD " + path, async () => {
            const {header, text} = await agent.head(path);
            const expected = "GET [SAMPLE]";
            assert.equal(text, undefined);
            assert.equal(header["content-length"], "" + expected.length);
        });

        it("POST " + path, async () => {
            const {header, text} = await agent.post(path);
            const expected = "POST [SAMPLE]";
            assert.equal(text, expected);
            assert.equal(header["content-length"], "" + expected.length);
        });
    }
});

function getAgent() {
    const app = express();
    app.use(sed("s/sample/[SAMPLE]/g"));
    app.use("/api/", sampleAPI());
    app.use(express.static(documentRoot));
    return request(app);
}

function sampleAPI(): express.RequestHandler {
    return (req, res, next) => {
        const body = req.method + " sample";
        res.header("Content-Length", "" + body.length);
        if (req.method === "HEAD") {
            res.end();
        } else {
            res.send(body);
        }
    };
}
