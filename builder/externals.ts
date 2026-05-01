import {builtinModules} from "node:module"

// Anything that ships in `dependencies` or comes from Node core is resolved
// by the consumer at runtime — never bundle it. Cover both the bare specifier
// (`stream`) and the `node:` prefixed form (`node:stream`) so the result does
// not depend on which form a particular source file uses. `express` is kept
// external too: it is a peer at runtime even though we only see it through
// `express-intercept`'s types here.
const externals = new Set<string>([
    ...builtinModules,
    ...builtinModules.map(m => `node:${m}`),
    "express",
    "express-intercept",
    "sed-lite",
])

export const isExternal = (id: string): boolean => externals.has(id)
