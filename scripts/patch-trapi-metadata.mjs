#!/usr/bin/env node
/*
 * Workaround for https://github.com/tada5hi/trapi/issues/821 —
 * @trapi/metadata's getInitializerValue dereferences `symbol.valueDeclaration`
 * without guarding against `getSymbolAtLocation` returning `undefined`. That
 * crashes when scanning decorators whose arguments include arrow-function
 * expressions the TS checker can't resolve to a symbol (e.g. TypeORM's
 * `@Tree('closure-table', { ancestorColumnName: () => 'ancestor_id', ... })`
 * on `PolicyEntity`).
 *
 * This patch inserts a `if (!symbol) return;` guard before the dereference.
 * Idempotent: safe to run multiple times.
 *
 * Remove this script (and its postinstall wiring) once @trapi/metadata ships
 * a release that includes the upstream fix.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
    path.join(ROOT, 'apps/server-core/node_modules/@trapi/metadata/dist/index.mjs'),
    path.join(ROOT, 'node_modules/@trapi/metadata/dist/index.mjs'),
];

const NEEDLE = 'const symbol = typeChecker.getSymbolAtLocation(initializer);\n\t\t\treturn getInitializerValue(extractInitializer(symbol.valueDeclaration)';
const REPLACEMENT = 'const symbol = typeChecker.getSymbolAtLocation(initializer);\n\t\t\tif (!symbol) return;\n\t\t\treturn getInitializerValue(extractInitializer(symbol.valueDeclaration)';

let patched = 0;
let skipped = 0;
for (const target of TARGETS) {
    if (!fs.existsSync(target)) {
        continue;
    }

    const original = fs.readFileSync(target, 'utf8');
    if (original.includes('if (!symbol) return;')) {
        skipped += 1;
        continue;
    }

    if (!original.includes(NEEDLE)) {
        console.warn(`[patch-trapi-metadata] needle not found in ${target} — upstream may have changed; please remove this script.`);
        continue;
    }

    fs.writeFileSync(target, original.replace(NEEDLE, REPLACEMENT));
    patched += 1;
}

if (patched > 0) {
    console.log(`[patch-trapi-metadata] patched ${patched} file${patched === 1 ? '' : 's'}.`);
}
if (skipped > 0 && patched === 0) {
    console.log('[patch-trapi-metadata] already patched.');
}
