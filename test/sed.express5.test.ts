// Test entry for the Express 5 line.
// Imports each topic module from test/lib/ and runs them all under a single
// top-level describe so the source-of-truth granularity matches the original
// per-topic file layout.

import express5 from "express5"
import {describe} from "node:test"
import {runChunkedTests} from "./lib/chunked.ts"
import {runContentTypeTests} from "./lib/content-type.ts"
import {runGzipTests} from "./lib/gzip.ts"
import {runMethodTests} from "./lib/method.ts"
import {runRegexpTests} from "./lib/regexp.ts"
import {runSedTests} from "./lib/sed.ts"
import {runSynopsisTests} from "./lib/synopsis.ts"
import type {ExpressModule} from "./lib/util.ts"

// Runtime tests cover both Express 4 and 5. Type-level dual coverage
// is intentionally out of scope, so this cast pins express5 to the
// Express 4 baseline that the shared runners type-check against.
const express = express5 as unknown as ExpressModule

describe("sed.express5.test.ts", () => {
    runSedTests(express)
    runChunkedTests(express)
    runRegexpTests(express)
    runMethodTests(express)
    runContentTypeTests(express)
    runGzipTests(express)
    runSynopsisTests(express)
})
