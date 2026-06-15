// 40.method: HTTP method filter and HEAD body / header treatment.

import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import supertest from "supertest"

import {sed} from "../../lib/express-sed.ts"
import {type ExpressModule, documentRoot} from "./util.ts"

export function runMethodTests(express: ExpressModule): void {
    describe("40.method: method filter (custom regexp)", () => {
        const buildAgent = () => {
            const app = express()
            app.use(sed("s/sample/[SAMPLE]/g", {method: /GET|HEAD|POST/}))
            app.use("/api/", sampleAPI(express))
            app.use(express.static(documentRoot))
            return supertest(app)
        }

        it("GET /sample.txt — body transformed, Content-Length recomputed", async () => {
            const agent = buildAgent()
            const res = await agent.get("/sample.txt")
            assert.equal(res.text, "[SAMPLE] text\n")
            assert.equal(res.headers["content-length"], String("[SAMPLE] text\n".length))
        })

        it("HEAD /sample.txt — body empty, Content-Length and ETag stripped", async () => {
            const agent = buildAgent()
            const res = await agent.head("/sample.txt")
            assert.equal(res.text, undefined)
            assert.equal(res.headers["content-length"], undefined)
            assert.equal(res.headers["etag"], undefined)
        })

        it("GET /api/", async () => {
            const agent = buildAgent()
            const res = await agent.get("/api/")
            assert.equal(res.headers["x-method"], "GET")
            assert.equal(res.text, "GET [SAMPLE]")
        })

        it("HEAD /api/ — body empty, Content-Length stripped, X-Method preserved", async () => {
            const agent = buildAgent()
            const res = await agent.head("/api/")
            assert.equal(res.text, undefined)
            // sampleAPI sees the real HEAD method (sed does not swap it),
            // so X-Method is recorded as "HEAD" by the upstream and the
            // header survives intercept's body strip.
            assert.equal(res.headers["x-method"], "HEAD")
            assert.equal(res.headers["content-length"], undefined)
        })

        it("POST /api/", async () => {
            const agent = buildAgent()
            const res = await agent.post("/api/")
            assert.equal(res.headers["x-method"], "POST")
            assert.equal(res.text, "POST [SAMPLE]")
        })
    })

    describe("40.method: default filter strips HEAD's stale headers", () => {
        // No method option: every method (including HEAD) flows through
        // sed. HEAD specifically is routed through the response handler
        // that calls `res.removeHeader("ETag")` / `removeHeader("Content-
        // Length")` directly, so the upstream's pre-replace values never
        // reach the client and the outcome does not depend on the app's
        // `etag fn` setting.
        const buildAgent = () => {
            const app = express()
            app.use(sed("s/sample/[SAMPLE]/g"))
            app.use(express.static(documentRoot))
            return supertest(app)
        }

        it("HEAD /sample.txt — body empty, Content-Length and ETag both removed", async () => {
            const agent = buildAgent()
            const res = await agent.head("/sample.txt")
            assert.equal(res.text, undefined)
            assert.equal(res.headers["content-length"], undefined)
            assert.equal(res.headers["etag"], undefined)
        })

        it("GET /sample.txt — body transformed, Content-Length matches the post-replace length", async () => {
            const agent = buildAgent()
            const res = await agent.get("/sample.txt")
            assert.equal(res.text, "[SAMPLE] text\n")
            assert.equal(res.headers["content-length"], String(Buffer.byteLength(res.text)))
        })
    })
}

function sampleAPI(_express: ExpressModule) {
    return (req: any, res: any, _next: any) => {
        const body = req.method + " sample"
        res.header("Content-Length", String(body.length))
        res.header("X-Method", req.method)

        if (req.method === "HEAD") {
            res.end()
        } else {
            res.send(body)
        }
    }
}
