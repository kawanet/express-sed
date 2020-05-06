#!/usr/bin/env mocha -R spec

import * as express from "express";
import * as request from "supertest";

const sed = require("../lib/express-sed").sed;

const TITLE = __filename.split("/").pop();

const documentRoot = __dirname + "/htdocs";

describe(TITLE, () => {
    it("replace with string", () => {
        const app = express();

        app.use(sed((body: string) => body.replace("Copyright (c) [year]", "Copyright (c) 2020")));

        app.use(express.static(documentRoot));

        return request(app).get("/sample.html").expect(/Copyright \(c\) 2020/);
    });

    it("replace by function", () => {
        const app = express();

        const vars: any = {year: "2020"};
        app.use(sed((body: string) => body.replace(/\[(\w+)\]/g, (match, $1) => vars[$1])));

        app.use(express.static(documentRoot));

        return request(app).get("/sample.html").expect(/Copyright \(c\) 2020/);
    });

    it("replace like sed", () => {
        const app = express();

        app.use(sed('s/Copyright \\(c\\) \\[year\\]/Copyright (c) 2020/'));

        app.use(express.static(documentRoot));

        return request(app).get("/sample.html").expect(/Copyright \(c\) 2020/);
    });
});
