/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/*
 * Re-establish the explicit cascade-layer order in the bundled CSS.
 *
 * rolldown's CSS pipeline drops bare `@layer a, b, …;` statement rules
 * while inlining @imports (both the one in src/index.css and one placed
 * ahead of the import in src/style.css). Without the statement, the
 * published bundle's layer order would rest on the accidental
 * first-appearance order of the inlined blocks — any future import
 * reshuffle could silently flip e.g. `authup` after `base`, breaking
 * the documented token-override seam. Layer order is fixed at FIRST
 * declaration, so prepending here is authoritative.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAYER_ORDER = '@layer theme, vuecs, authup, base, components, utilities;\n';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'style.css');
const content = readFileSync(file, 'utf8');

if (!content.startsWith(LAYER_ORDER)) {
    writeFileSync(file, LAYER_ORDER + content);
}
