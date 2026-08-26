/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Writes the config registry as a JSON Schema document into dist/, so a
 * published install ships `config-schema.json` next to the code that
 * derives it, and into the documentation's public directory, from where it
 * is served at the URL the `# yaml-language-server: $schema=` line of an
 * `authup.yml` names. The docs copy is committed, so a registry change that
 * forgets to rebuild leaves it stale; `test/unit/config/schema.spec.ts`
 * fails on that.
 *
 * A thin writer over the built module: the builder lives in TypeScript
 * (`src/app/modules/config/json-schema.ts`) so a CLI command can reuse it
 * in process. Runs with plain node after the js build; the registry
 * imports nothing that needs the reflect-metadata polyfill.
 *
 *   node scripts/emit-config-schema.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfigJSONSchema } from '../dist/app/modules/config/json-schema.mjs';

const packagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = `${JSON.stringify(buildConfigJSONSchema(), null, 4)}\n`;

const filePaths = [
    path.join(packagePath, 'dist', 'config-schema.json'),
    path.join(packagePath, '..', '..', 'docs', 'src', 'public', 'schema', 'config.json'),
];

for (const filePath of filePaths) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);

    console.log(`[config-schema] wrote ${filePath}`);
}
