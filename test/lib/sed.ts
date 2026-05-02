// 10.sed: bulk sed against static files (text passthrough, text transform, binary ignored).

import {describe, it} from "node:test";
import * as fs from "node:fs";
import supertest from "supertest";

import {sed} from "../../lib/express-sed.ts";
import {
    type ExpressModule,
    binaryFiles,
    binaryFn,
    concatParser,
    documentRoot,
    stringFn,
    textFiles,
} from "./util.ts";

export function runSedTests(express: ExpressModule): void {
    describe("10.sed: text content without sed", () => {
        for (const p of textFiles) {
            it(p, async () => {
                const app = express();
                app.use(express.static(documentRoot));
                const body = fs.readFileSync(documentRoot + p, "utf8");
                await supertest(app).get(p).expect(body);
            });
        }
    });

    describe("10.sed: text content transformed with sed", () => {
        for (const p of textFiles) {
            it(p, async () => {
                const app = express();
                app.use(sed(stringFn));
                app.use(express.static(documentRoot));
                const body = fs.readFileSync(documentRoot + p, "utf8");
                await supertest(app).get(p).expect(stringFn(body));
            });
        }
    });

    describe("10.sed: binary content ignored even with sed", () => {
        for (const p of binaryFiles) {
            it(p, async () => {
                const app = express();
                app.use(sed(binaryFn));
                app.use(express.static(documentRoot));
                const body = fs.readFileSync(documentRoot + p);
                await supertest(app).get(p).buffer(true).parse(concatParser as any).expect(body as any);
            });
        }
    });
}
