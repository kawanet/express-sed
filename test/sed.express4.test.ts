// Test entry for the Express 4 line.
// Imports each topic module from test/lib/ and runs them all under a single
// top-level describe so the source-of-truth granularity matches the original
// per-topic file layout.

import express from "express4"
import {describe} from "node:test"
import {runChunkedTests} from "./lib/chunked.ts"
import {runContentTypeTests} from "./lib/content-type.ts"
import {runGzipTests} from "./lib/gzip.ts"
import {runMethodTests} from "./lib/method.ts"
import {runRegexpTests} from "./lib/regexp.ts"
import {runSedTests} from "./lib/sed.ts"
import {runSynopsisTests} from "./lib/synopsis.ts"

describe("sed.express4.test.ts", () => {
    runSedTests(express)
    runChunkedTests(express)
    runRegexpTests(express)
    runMethodTests(express)
    runContentTypeTests(express)
    runGzipTests(express)
    runSynopsisTests(express)
})
