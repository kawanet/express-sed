#!/usr/bin/env mocha -R spec

import * as express from "express";
import {sed} from "../";
import * as request from "supertest";

const TITLE = __filename.split("/").pop();

describe(TITLE, () => {
    describe("regular expressions", () => {
        {
            const def = "(without sed)";
            it(def, () => {
                const app = express();
                app.use(returnBody());
                return request(app).get("/?body=[foo][foo]").expect("[foo][foo]");
            });
        }

        {
            const def = "s/foo/FOO/";
            it(def, () => {
                const app = express();
                app.use(sed(def));
                app.use(returnBody());
                return request(app).get("/?body=[foo][foo]").expect("[FOO][foo]");
            });
        }

        {
            const def = "s/foo/FOO/g";
            it(def, () => {
                const app = express();
                app.use(sed(def));
                app.use(returnBody());
                return request(app).get("/?body=[foo][foo]").expect("[FOO][FOO]");
            });
        }

        {
            const def = "s/fo+/FO+/g";
            it(def, () => {
                const app = express();
                app.use(sed(def));
                app.use(returnBody());
                return request(app).get("/?body=[foo][foo]").expect("[FO+][FO+]");
            });
        }

        {
            const def = "s/f(o+)/F$1/g";
            it(def, () => {
                const app = express();
                app.use(sed(def));
                app.use(returnBody());
                return request(app).get("/?body=[foo][foo]").expect("[Foo][Foo]");
            });
        }


        {
            const def = "s/foo\\/foo/FOO=FOO/g";
            it(def, () => {
                const app = express();
                app.use(sed(def));
                app.use(returnBody());
                return request(app).get("/?body=[foo/foo]").expect("[FOO=FOO]");
            });
        }

        {
            const def = "s:f(o+):(F$1$1):g";
            it(def, () => {
                const app = express();
                app.use(sed(def));
                app.use(returnBody());
                return request(app).get("/?body=[foo][foo]").expect("[(Foooo)][(Foooo)]");
            });
        }
    });
});

function returnBody(): express.RequestHandler {
    return (req, res, next) => {
        res.send(req.query.body);
    };
}
