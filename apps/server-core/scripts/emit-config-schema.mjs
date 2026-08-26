/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Writes the config registry as a JSON Schema document into dist/, so a
 * published install ships `config-schema.json` next to the code that
 * derives it.
 *
 * A thin writer over the built module: the builder lives in TypeScript
 * (`src/app/modules/config/json-schema.ts`) so a CLI command can reuse it
 * in process. Runs with plain node after the js build; the registry
 * imports nothing that needs the reflect-metadata polyfill.
 *
 *   node scripts/emit-config-schema.mjs
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfigJSONSchema } from '../dist/app/modules/config/json-schema.mjs';

const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const filePath = path.join(distPath, 'config-schema.json');

await writeFile(filePath, `${JSON.stringify(buildConfigJSONSchema(), null, 4)}\n`);

console.log(`[config-schema] wrote ${filePath}`);
