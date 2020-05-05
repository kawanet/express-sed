#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

import {sed} from "../lib/express-sed";

const TITLE = __filename.split("/").pop();

describe(TITLE, () => {
    const agent = getAgent();
    const match = "etag";
    const range = "bytes=0-1";
    const headers = {
        "If-None-Match": match,
        "Range": range,
    };

    {
        const path = "/without-sed/without-condition/";
        it(path, async () => {
            return agent.get(path).expect(["sample", "-", "-", "sample"].join("/"));
        });
    }
    {
        const path = "/without-sed/with-condition/";
        it(path, async () => {
            return agent.get(path).set(headers).expect(["sample", match, range, "sample"].join("/"));
        });
    }
    {
        const path = "/with-sed/without-condition/";
        it(path, async () => {
            return agent.get(path).expect(["SAMPLE", "-", "-", "SAMPLE"].join("/"));
        });
    }
    {
        const path = "/with-sed/with-condition/";
        it(path, async () => {
            return agent.get(path).set(headers).expect(["SAMPLE", "-", "-", "SAMPLE"].join("/"));
        });
    }
});

function getAgent() {
    const app = express();
    app.get("/without-sed/:cond", sampleAPI());
    app.use(sed("s/sample/SAMPLE/g"));
    app.get("/with-sed/:cond", sampleAPI());
    return request(app);
}

function sampleAPI(): express.RequestHandler {
    return (req, res, next) => {
        const match = req.header("if-none-match") || "-";
        const range = req.headers["range"] || "-";
        const body = ["sample", match, range, "sample"].join("/");
        res.type("html").send(body);
    };
}
