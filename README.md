# express-sed

Express middleware to transform response body

[![Node.js CI](https://github.com/kawanet/express-sed/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/kawanet/express-sed/actions/)
[![npm version](https://badge.fury.io/js/express-sed.svg)](https://www.npmjs.com/package/express-sed)

## SYNOPSIS

```js
const express = require("express");
const sed = require("express-sed").sed;
const app = express();

// replace with string pair
app.use(sed(body => body.replace("Copyright (c) [year]", "Copyright (c) 2020")));

// replace by function
const vars = {year: "2020"};
app.use(sed(body => body.replace(/\[(\w+)\]/g, (match, $1) => vars[$1])));

// replace with `sed` transform definition for content type specified
app.use(sed("s/&copy;/(c)/g", {contentType: "text/html"}));

app.use(express.static("htdocs"));
app.listen(3000);
```

## SEE ALSO

- https://github.com/kawanet/sed-lite
- https://github.com/kawanet/express-intercept

## LICENSE

The MIT License (MIT)

Copyright (c) 2020 Yusuke Kawasaki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
