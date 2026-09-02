/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);

/**
 * `authup dev` runs server-core from TypeScript in this workspace, which the
 * `authup-source` export condition is the whole mechanism for: ts-node
 * applies no tsconfig `paths` at runtime, so without the condition the import
 * resolves to the built dist and the dev loop silently stops picking up
 * source edits. A dark gate is indistinguishable from a working one, so it
 * is asserted rather than assumed.
 *
 * The condition is authup's OWN name rather than the community `development`
 * one, and that is load-bearing: `development` is a PUBLIC condition vite and
 * vitest set by default in serve mode, while the published tarball ships
 * `files: ["dist"]` and no `src/`. Node does not fall through to the next
 * condition when a matched target is missing, so declaring `development`
 * meant every downstream consumer importing @authup/server-core under vitest
 * got ERR_MODULE_NOT_FOUND for a source tree that never shipped. A name only
 * this repository's own scripts pass cannot be selected by accident.
 */
async function resolveServerCore(conditions: string[]) : Promise<string> {
    const { stdout } = await run(process.execPath, [
        ...conditions.map((value) => `--conditions=${value}`),
        '--input-type=module',
        '-e',
        'process.stdout.write(import.meta.resolve("@authup/server-core"))',
    ], { cwd: fileURLToPath(new URL('../../', import.meta.url)) });

    return stdout;
}

describe('the authup-source export condition', () => {
    it('resolves server-core to its source', async () => {
        expect(await resolveServerCore(['authup-source'])).toContain('/src/index.ts');
    });

    it('resolves server-core to its dist without the condition', async () => {
        expect(await resolveServerCore([])).toContain('/dist/index.mjs');
    });

    it('resolves server-core to its dist under the public development condition', async () => {
        expect(await resolveServerCore(['development'])).toContain('/dist/index.mjs');
    });
});
