// 60.gzip: transparently sed compressed responses.

import {describe, it} from "node:test"
import {promisify} from "node:util"
import {deflate, gzip} from "node:zlib"
import supertest from "supertest"
import {sed} from "../../lib/express-sed.ts"
import {type ExpressModule} from "./util.ts"

const encoders = {
    gzip: promisify(gzip),
    deflate: promisify(deflate),
} as Record<string, (buf: Buffer) => Promise<Buffer>>

export function runGzipTests(express: ExpressModule): void {
    describe("60.gzip: gzip / deflate", () => {
        const buildAgent = () => {
            const app = express()
            app.get("/without-sed/:encoding", sampleEncoded(express))
            app.use(sed("s/sample/[SAMPLE]/g"))
            app.get("/with-sed/:encoding", sampleEncoded(express))
            return supertest(app)
        }

        const cases = [
            {path: "/without-sed/gzip", expected: "sample:gzip"},
            {path: "/without-sed/deflate", expected: "sample:deflate"},
            {path: "/with-sed/gzip", expected: "[SAMPLE]:gzip"},
            {path: "/with-sed/deflate", expected: "[SAMPLE]:deflate"},
        ]

        for (const c of cases) {
            it(c.path, async () => {
                await buildAgent().get(c.path).expect(c.expected)
            })
        }
    })
}

function sampleEncoded(_express: ExpressModule) {
    return async (req: any, res: any, _next: any) => {
        const encoding = req.params.encoding
        const body = "sample:" + encoding
        let buffer: Buffer = Buffer.from(body)

        const encoder = encoders[encoding]
        if (encoder) buffer = await encoder(buffer)

        res.status(200)
        res.header("Content-Type", "text/plain")
        res.header("Content-Encoding", encoding)
        res.header("Content-Length", String(buffer.length))

        // Write one byte per chunk to force the stream path.
        for (const byte of buffer) {
            res.write(Buffer.from([byte]))
        }

        res.end()
    }
}
