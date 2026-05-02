// 40.method: HTTP method filter.

import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import supertest from "supertest";

import {sed} from "../../lib/express-sed.ts";
import {type ExpressModule, documentRoot} from "./util.ts";

export function runMethodTests(express: ExpressModule): void {
    describe("40.method: method filter", () => {
        const buildAgent = () => {
            const app = express();
            app.use(sed("s/sample/[SAMPLE]/g", {method: /GET|HEAD|POST/}));
            app.use("/api/", sampleAPI(express));
            app.use(express.static(documentRoot));
            return supertest(app);
        };

        it("GET /sample.txt", async () => {
            const agent = buildAgent();
            const res = await agent.get("/sample.txt");
            assert.equal(res.text, "[SAMPLE] text\n");
        });

        it("HEAD /sample.txt", async () => {
            const agent = buildAgent();
            const res = await agent.head("/sample.txt");
            assert.equal(res.text, undefined);
        });

        it("GET /api/", async () => {
            const agent = buildAgent();
            const res = await agent.get("/api/");
            assert.equal(res.headers["x-method"], "GET");
            assert.equal(res.text, "GET [SAMPLE]");
        });

        it("HEAD /api/", async () => {
            const agent = buildAgent();
            const res = await agent.head("/api/");
            assert.equal(res.headers["x-method"], "HEAD");
            assert.equal(res.text, undefined);
        });

        it("POST /api/", async () => {
            const agent = buildAgent();
            const res = await agent.post("/api/");
            assert.equal(res.headers["x-method"], "POST");
            assert.equal(res.text, "POST [SAMPLE]");
        });
    });
}

function sampleAPI(_express: ExpressModule) {
    return (req: any, res: any, _next: any) => {
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
