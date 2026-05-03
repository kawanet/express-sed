// 50.content-type: Content-Type filter.

import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import supertest from "supertest";

import {sed} from "../../lib/express-sed.ts";
// Self-reference: resolve via `package.json` `exports.types` so a broken
// public type-export setup would surface here in `tsc --noEmit`.
import type {SedOptions} from "express-sed";
import {type ExpressModule, documentRoot} from "./util.ts";

export function runContentTypeTests(express: ExpressModule): void {
    describe("50.content-type: content-type filter", () => {
        const buildAgent = (options: SedOptions) => {
            const app = express();
            app.use(sed("s/sample/<SAMPLE>/g", options));
            app.use(express.static(documentRoot));
            return supertest(app);
        };

        it("only text/html is transformed", async () => {
            const agent = buildAgent({contentType: /^text\/html/});
            await agent.get("/sample.html").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), true));
            await agent.get("/sample.css").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), false));
        });

        it("only text/css is transformed", async () => {
            const agent = buildAgent({contentType: /^text\/css/});
            await agent.get("/sample.html").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), false));
            await agent.get("/sample.css").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), true));
        });
    });
}
