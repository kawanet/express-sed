// 20.chunked: chunked responses written one byte at a time.

import * as fs from "node:fs"
import {describe, it} from "node:test"
import supertest from "supertest"
import {sed} from "../../lib/express-sed.ts"
import {
    type ExpressModule,
    binaryFiles,
    binaryFn,
    chunkedStatic,
    concatParser,
    documentRoot,
    stringFn,
    textFiles,
} from "./util.ts"

export function runChunkedTests(express: ExpressModule): void {
    describe("20.chunked: text content without sed", () => {
        for (const p of textFiles) {
            it(p, async () => {
                const app = express()
                app.use(chunkedStatic(express, documentRoot))
                const body = fs.readFileSync(documentRoot + p, "utf8")
                await supertest(app).get(p).expect(body)
            })
        }
    })

    describe("20.chunked: text content transformed with sed", () => {
        for (const p of textFiles) {
            it(p, async () => {
                const app = express()
                app.use(sed(stringFn))
                app.use(chunkedStatic(express, documentRoot))
                const body = fs.readFileSync(documentRoot + p, "utf8")
                await supertest(app).get(p).expect(stringFn(body))
            })
        }
    })

    describe("20.chunked: binary content ignored even with sed", () => {
        for (const p of binaryFiles) {
            it(p, async () => {
                const app = express()
                app.use(sed(binaryFn))
                app.use(chunkedStatic(express, documentRoot))
                const body = fs.readFileSync(documentRoot + p)
                await supertest(app).get(p).buffer(true).parse(concatParser as any).expect(body as any)
            })
        }
    })
}
