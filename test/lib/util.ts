// Shared helpers used across the per-topic test modules.
// Kept minimal so each topic file can stay focused on its scenarios.

import {fileURLToPath} from "node:url"
import * as fs from "node:fs"
import * as path from "node:path"

// The full Express module/namespace value: call signature + namespace
// methods (`.static`, `.Router`, `.json`, ...) the runners reach for.
// Express ships as a CommonJS `export = e` namespace, so
// `typeof import("express")` resolves to the value of `import express
// from "express"` directly (no `.default`).
export type ExpressModule = typeof import("express")

// Minimal Content-Type mapping used only by these test fixtures —
// avoids pulling in the real `mime-types` package.
const mimeMap: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".gif": "image/gif",
    ".png": "image/png",
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const documentRoot = path.resolve(__dirname, "..", "htdocs")

export const textFiles = [
    "/sample.css",
    "/sample.html",
    "/sample.js",
    "/sample.json",
    "/sample.txt",
    "/sample.xml",
]

export const binaryFiles = [
    "/empty.gif",
    "/empty.png",
]

export const stringFn = (src: string) => src.replace(/(sample)/g, "[$1]")
export const binaryFn = (src: string) => src.replace(/(GIF|PNG)/, "[$1]")

/**
 * superagent parser to concatenate chunked response body
 */
export function concatParser(res: NodeJS.ReadableStream, fn: (err: Error | null, data?: Buffer) => void) {
    const data: Buffer[] = []
    res.on("data", chunk => data.push(chunk as Buffer))
    res.on("end", () => fn(null, Buffer.concat(data)))
    res.on("error", err => fn(err))
}

/**
 * middleware to respond a static file chunked by each byte
 */
export function chunkedStatic(_express: ExpressModule, htdocs: string) {
    return (req: any, res: any, _next: any) => {
        const filePath = htdocs + req.path
        const ext = path.extname(filePath)
        const type = mimeMap[ext]
        if (type) res.type(type)

        const data = fs.readFileSync(filePath)
        res.header("Content-Length", String(data.length))
        const queue = [...data]
        writeChunk()

        function writeChunk() {
            const byte = queue.shift()!
            const chunk = Buffer.from([byte])
            if (queue.length) {
                res.write(chunk, writeChunk)
            } else {
                res.end(chunk)
            }
        }
    }
}
