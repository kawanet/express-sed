#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";
import {strict as assert} from "assert";

import {sed} from "../";

const TITLE = __filename.split("/").pop();

const documentRoot = __dirname + "/htdocs";

describe(TITLE, () => {
    const agent = getAgent();
    {
        const path = "/sample.txt";
        const expected = "[SAMPLE] text\n";

        it("GET " + path, async () => {
            const {text} = await agent.get(path);
            assert.equal(text, expected);
        });

        it("HEAD " + path, async () => {
            const {text} = await agent.head(path);
            assert.equal(text, undefined);
        });
    }

    {
        const path = "/api/";

        it("GET " + path, async () => {
            const {header, text} = await agent.get(path);
            const expected = "GET [SAMPLE]";
            assert.equal(header["x-method"], "GET");
            assert.equal(text, expected);
        });

        it("HEAD " + path, async () => {
            const {header, text} = await agent.head(path);
            assert.equal(header["x-method"], "HEAD"); // original
            // assert.equal(header["x-method"], "GET"); // if overridden
            assert.equal(text, undefined);
        });

        it("POST " + path, async () => {
            const {header, text} = await agent.post(path);
            const expected = "POST [SAMPLE]";
            assert.equal(header["x-method"], "POST");
            assert.equal(text, expected);
        });
    }
});

function getAgent() {
    const app = express();
    app.use(sed("s/sample/[SAMPLE]/g", {method: /GET|HEAD|POST/}));
    app.use("/api/", sampleAPI());
    app.use(express.static(documentRoot));
    return request(app);
}

function sampleAPI(): express.RequestHandler {
    return (req, res, next) => {
        const body = req.method + " sample";
        res.header("Content-Length", String(body.length));
        res.header("X-Method", req.method);

        if (req.method === "HEAD") {
            res.end();
        } else {
            res.send(body);
        }
    };
}
