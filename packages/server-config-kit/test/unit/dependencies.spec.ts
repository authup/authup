/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PACKAGE_PATH = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function readPackageJSON() : Record<string, any> {
    return JSON.parse(readFileSync(path.join(PACKAGE_PATH, 'package.json'), 'utf8'));
}

// A console service package must be able to take this one without inheriting
// server-core's or server-kit's tail (native @node-rs/bcrypt and jsonwebtoken,
// winston, redis, the socket.io emitter, @rapiq/core), so the dependency set is
// pinned rather than merely reviewed.
describe('package.json', () => {
    it('should declare no @authup dependency', () => {
        const data = readPackageJSON();

        for (const name of Object.keys(data.dependencies)) {
            expect(name.startsWith('@authup/')).toEqual(false);
        }
    });

    it('should declare exactly the four third-party dependencies', () => {
        const data = readPackageJSON();

        expect(Object.keys(data.dependencies).sort()).toEqual([
            '@validup/zod',
            'envix',
            'validup',
            'zod',
        ]);
    });

    it('should declare no peer dependencies', () => {
        const data = readPackageJSON();

        expect(data).not.toHaveProperty('peerDependencies');
    });
});
