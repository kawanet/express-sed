// 90.synopsis: same usage shown in the README SYNOPSIS.

import {describe, it} from "node:test";
import supertest from "supertest";

import {sed} from "../../lib/express-sed.ts";
import {type ExpressModule, documentRoot} from "./util.ts";

export function runSynopsisTests(express: ExpressModule): void {
    describe("90.synopsis", () => {
        it("replace with string", async () => {
            const app = express();
            app.use(sed((body: string) => body.replace("Copyright (c) [year]", "Copyright (c) 2020")));
            app.use(express.static(documentRoot));
            await supertest(app).get("/sample.html").expect(/Copyright \(c\) 2020/);
        });

        it("replace by function", async () => {
            const app = express();
            const vars: Record<string, string> = {year: "2020"};
            app.use(sed((body: string) => body.replace(/\[(\w+)\]/g, (_match, k) => vars[k])));
            app.use(express.static(documentRoot));
            await supertest(app).get("/sample.html").expect(/Copyright \(c\) 2020/);
        });

        it("replace like sed", async () => {
            const app = express();
            app.use(sed("s/Copyright \\(c\\) \\[year\\]/Copyright (c) 2020/"));
            app.use(express.static(documentRoot));
            await supertest(app).get("/sample.html").expect(/Copyright \(c\) 2020/);
        });
    });
}
