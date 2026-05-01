// 共通の express バージョン非依存のテストロジック。
// express 本体を引数で受け取り、両系列で同一ケースを実行する。

import {strict as assert} from "node:assert";
import {describe, it} from "node:test";
import {fileURLToPath} from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import {gzip, deflate} from "node:zlib";
import {promisify} from "node:util";
import supertest from "supertest";

import {sed} from "../../lib/express-sed.ts";
import type {SedOptions} from "../../types/express-sed.d.ts";

// テスト fixture でしか使わない最小限の Content-Type マッピング。
// 本物の mime-types を引き入れずに済ませる。
const mimeMap: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".gif": "image/gif",
    ".png": "image/png",
};

// express の default export だけ型として受け取れれば良い。
// 4/5 で型が異なるが、ここでは構造的互換のため any 経由で扱う。
type ExpressModule = any;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const documentRoot = path.resolve(__dirname, "..", "htdocs");

const stringFn = (src: string) => src.replace(/(sample)/g, "[$1]");
const binaryFn = (src: string) => src.replace(/(GIF|PNG)/, "[$1]");

const encoders = {
    gzip: promisify(gzip),
    deflate: promisify(deflate),
} as Record<string, (buf: Buffer) => Promise<Buffer>>;

/**
 * superagent parser to concatenate chunked response body
 */
function concatParser(res: NodeJS.ReadableStream, fn: (err: Error | null, data?: Buffer) => void) {
    const data: Buffer[] = [];
    res.on("data", chunk => data.push(chunk as Buffer));
    res.on("end", () => fn(null, Buffer.concat(data)));
}

/**
 * 1 byte ずつ chunked で配信するミドルウェア。
 * Content-Length は付けるが Transfer-Encoding: chunked になる。
 */
function chunkedStatic(_express: ExpressModule, htdocs: string) {
    return (req: any, res: any, _next: any) => {
        const filePath = htdocs + req.path;
        const ext = path.extname(filePath);
        const type = mimeMap[ext];
        if (type) res.type(type);

        const data = fs.readFileSync(filePath);
        res.header("Content-Length", String(data.length));
        const queue = [...data];
        writeChunk();

        function writeChunk() {
            const byte = queue.shift()!;
            const chunk = Buffer.from([byte]);
            if (queue.length) {
                res.write(chunk, writeChunk);
            } else {
                res.end(chunk);
            }
        }
    };
}

const textFiles = [
    "/sample.css",
    "/sample.html",
    "/sample.js",
    "/sample.json",
    "/sample.txt",
    "/sample.xml",
];

const binaryFiles = [
    "/empty.gif",
    "/empty.png",
];

/**
 * express 4/5 共通のテストケース集。
 * `label` を describe ラベルとして使用する。
 */
export function sharedTests(express: ExpressModule, label: string): void {
    describe(label, () => {
        // ----- 10.sed: 静的ファイルに対する一括 sed -----
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

        // ----- 20.chunked: 1 byte 刻みの chunked レスポンス -----
        describe("20.chunked: text content without sed", () => {
            for (const p of textFiles) {
                it(p, async () => {
                    const app = express();
                    app.use(chunkedStatic(express, documentRoot));
                    const body = fs.readFileSync(documentRoot + p, "utf8");
                    await supertest(app).get(p).expect(body);
                });
            }
        });

        describe("20.chunked: text content transformed with sed", () => {
            for (const p of textFiles) {
                it(p, async () => {
                    const app = express();
                    app.use(sed(stringFn));
                    app.use(chunkedStatic(express, documentRoot));
                    const body = fs.readFileSync(documentRoot + p, "utf8");
                    await supertest(app).get(p).expect(stringFn(body));
                });
            }
        });

        describe("20.chunked: binary content ignored even with sed", () => {
            for (const p of binaryFiles) {
                it(p, async () => {
                    const app = express();
                    app.use(sed(binaryFn));
                    app.use(chunkedStatic(express, documentRoot));
                    const body = fs.readFileSync(documentRoot + p);
                    await supertest(app).get(p).buffer(true).parse(concatParser as any).expect(body as any);
                });
            }
        });

        // ----- 30.regexp: sed-style 文字列定義の各種パターン -----
        describe("30.regexp: regular expressions", () => {
            const cases: { def: string; query: string; expected: string }[] = [
                {def: "(without sed)", query: "[foo][foo]", expected: "[foo][foo]"},
                {def: "s/foo/FOO/", query: "[foo][foo]", expected: "[FOO][foo]"},
                {def: "s/foo/FOO/g", query: "[foo][foo]", expected: "[FOO][FOO]"},
                {def: "s/fo+/FO+/g", query: "[foo][foo]", expected: "[FO+][FO+]"},
                {def: "s/f(o+)/F$1/g", query: "[foo][foo]", expected: "[Foo][Foo]"},
                {def: "s/foo\\/foo/FOO=FOO/g", query: "[foo/foo]", expected: "[FOO=FOO]"},
                {def: "s:f(o+):(F$1$1):g", query: "[foo][foo]", expected: "[(Foooo)][(Foooo)]"},
            ];

            for (const c of cases) {
                it(c.def, async () => {
                    const app = express();
                    if (c.def !== "(without sed)") app.use(sed(c.def));
                    app.use(returnBody(express));
                    await supertest(app).get("/?body=" + encodeURIComponent(c.query)).expect(c.expected);
                });
            }
        });

        // ----- 40.method: HTTP method フィルタ -----
        describe("40.method: method filter", () => {
            const buildAgent = () => {
                const app = express();
                app.use(sed("s/sample/[SAMPLE]/g", {method: /GET|HEAD|POST/}));
                app.use("/api/", sampleAPI(express));
                app.use(express.static(documentRoot));
                return supertest(app);
            };

            it("GET /sample.txt", async () => {
                const agent = buildAgent();
                const res = await agent.get("/sample.txt");
                assert.equal(res.text, "[SAMPLE] text\n");
            });

            it("HEAD /sample.txt", async () => {
                const agent = buildAgent();
                const res = await agent.head("/sample.txt");
                assert.equal(res.text, undefined);
            });

            it("GET /api/", async () => {
                const agent = buildAgent();
                const res = await agent.get("/api/");
                assert.equal(res.headers["x-method"], "GET");
                assert.equal(res.text, "GET [SAMPLE]");
            });

            it("HEAD /api/", async () => {
                const agent = buildAgent();
                const res = await agent.head("/api/");
                assert.equal(res.headers["x-method"], "HEAD");
                assert.equal(res.text, undefined);
            });

            it("POST /api/", async () => {
                const agent = buildAgent();
                const res = await agent.post("/api/");
                assert.equal(res.headers["x-method"], "POST");
                assert.equal(res.text, "POST [SAMPLE]");
            });
        });

        // ----- 50.content-type: Content-Type フィルタ -----
        describe("50.content-type: content-type filter", () => {
            const buildAgent = (options: SedOptions) => {
                const app = express();
                app.use(sed("s/sample/<SAMPLE>/g", options));
                app.use(express.static(documentRoot));
                return supertest(app);
            };

            it("only text/html is transformed", async () => {
                const agent = buildAgent({contentType: /^text\/html/});
                await agent.get("/sample.html").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), true));
                await agent.get("/sample.css").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), false));
            });

            it("only text/css is transformed", async () => {
                const agent = buildAgent({contentType: /^text\/css/});
                await agent.get("/sample.html").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), false));
                await agent.get("/sample.css").expect(200).then(res => assert.equal(/<SAMPLE>/.test(res.text), true));
            });
        });

        // ----- 60.gzip: 圧縮レスポンスを透過的に sed する -----
        describe("60.gzip: gzip / deflate", () => {
            const buildAgent = () => {
                const app = express();
                app.get("/without-sed/:encoding", sampleEncoded(express));
                app.use(sed("s/sample/[SAMPLE]/g"));
                app.get("/with-sed/:encoding", sampleEncoded(express));
                return supertest(app);
            };

            const cases = [
                {path: "/without-sed/gzip", expected: "sample:gzip"},
                {path: "/without-sed/deflate", expected: "sample:deflate"},
                {path: "/with-sed/gzip", expected: "[SAMPLE]:gzip"},
                {path: "/with-sed/deflate", expected: "[SAMPLE]:deflate"},
            ];

            for (const c of cases) {
                it(c.path, async () => {
                    await buildAgent().get(c.path).expect(c.expected);
                });
            }
        });

        // ----- 90.synopsis: README の SYNOPSIS と同等の使い方 -----
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
    });
}

function returnBody(_express: ExpressModule) {
    return (req: any, res: any, _next: any) => {
        res.send(req.query.body);
    };
}

function sampleAPI(_express: ExpressModule) {
    return (req: any, res: any, _next: any) => {
        const body = req.method + " sample";
        res.header("Content-Length", String(body.length));
        res.header("X-Method", req.method);

        if (req.method === "HEAD") {
            res.end();
        } else {
            res.send(body);
        }
    };
}

function sampleEncoded(_express: ExpressModule) {
    return async (req: any, res: any, _next: any) => {
        const encoding = req.params.encoding;
        const body = "sample:" + encoding;
        let buffer: Buffer = Buffer.from(body);

        const encoder = encoders[encoding];
        if (encoder) buffer = await encoder(buffer);

        res.status(200);
        res.header("Content-Type", "text/plain");
        res.header("Content-Encoding", encoding);
        res.header("Content-Length", String(buffer.length));

        // 1 byte 刻みで chunked に書き出して、stream 経路を経由させる。
        for (const byte of buffer) {
            res.write(Buffer.from([byte]));
        }

        res.end();
    };
}
