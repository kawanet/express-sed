#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";
import {strict as assert} from "assert";

import {sed, SedOptions} from "../";

const TITLE = __filename.split("/").pop();

const documentRoot = __dirname + "/htdocs";

describe(TITLE, () => {
    {
        const options = {contentType: /^text\/html/};
        const agent = getAgent(options);

        it(JSON.stringify(options), async () => {
            await agent.get("/sample.html").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), true));
            await agent.get("/sample.css").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), false));
        });
    }

    {
        const options = {contentType: /^text\/css/};
        const agent = getAgent(options);

        it(JSON.stringify(options), async () => {
            await agent.get("/sample.html").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), false));
            await agent.get("/sample.css").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), true));
        });
    }
});

function getAgent(options: SedOptions) {
    const app = express();
    app.use(sed("s/sample/<SAMPLE>/g", options));
    app.use(express.static(documentRoot));
    return request(app);
}
