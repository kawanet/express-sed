// 30.regexp: variations of sed-style string definitions.

import {describe, it} from "node:test"
import supertest from "supertest"

import {sed} from "../../lib/express-sed.ts"
import {type ExpressModule} from "./util.ts"

export function runRegexpTests(express: ExpressModule): void {
    describe("30.regexp: regular expressions", () => {
        const cases: {def: string; query: string; expected: string}[] = [
            {def: "(without sed)", query: "[foo][foo]", expected: "[foo][foo]"},
            {def: "s/foo/FOO/", query: "[foo][foo]", expected: "[FOO][foo]"},
            {def: "s/foo/FOO/g", query: "[foo][foo]", expected: "[FOO][FOO]"},
            {def: "s/fo+/FO+/g", query: "[foo][foo]", expected: "[FO+][FO+]"},
            {def: "s/f(o+)/F$1/g", query: "[foo][foo]", expected: "[Foo][Foo]"},
            {def: "s/foo\\/foo/FOO=FOO/g", query: "[foo/foo]", expected: "[FOO=FOO]"},
            {def: "s:f(o+):(F$1$1):g", query: "[foo][foo]", expected: "[(Foooo)][(Foooo)]"},
        ]

        for (const c of cases) {
            it(c.def, async () => {
                const app = express()
                if (c.def !== "(without sed)") app.use(sed(c.def))
                app.use(returnBody(express))
                await supertest(app).get("/?body=" + encodeURIComponent(c.query)).expect(c.expected)
            })
        }
    })
}

function returnBody(_express: ExpressModule) {
    return (req: any, res: any, _next: any) => {
        res.send(req.query.body)
    }
}
