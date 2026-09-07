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
//
// The pin guards that TAIL, not @authup/* as a category. `@authup/kit` is the
// one internal dependency allowed through: it is a foundation package carrying
// `destr` and `nanoid` and nothing else, every consumer of this package already
// declares it, and the sibling portable package `@authup/server-console-kit`
// declares it too. The blanket "no @authup dependency" rule this replaced was
// stricter than its own rationale, and the cost of that gap was real: the
// helpers were imported anyway, undeclared, which is invisible at runtime
// (npm workspaces symlink every package into the root node_modules) and in the
// dist (tsdown externalizes only DECLARED dependencies, so it inlined them) but
// left nx without a `server-config-kit -> kit` edge, free to build this package
// before `kit` had a dist to resolve against.
const DEPENDENCIES_ALLOWED = [
    '@authup/kit',
    '@validup/zod',
    'envix',
    'validup',
    'zod',
];

// Anything that would drag a native binding, a logger, a cache client or a
// query layer in behind this package.
const DEPENDENCIES_FORBIDDEN = [
    '@authup/server-kit',
    '@authup/server-core',
    '@authup/core-kit',
    '@rapiq/core',
];

describe('package.json', () => {
    it('should declare no dependency carrying server-core\'s or server-kit\'s tail', () => {
        const data = readPackageJSON();

        for (const name of DEPENDENCIES_FORBIDDEN) {
            expect(Object.keys(data.dependencies)).not.toContain(name);
        }
    });

    it('should declare no @authup dependency other than kit', () => {
        const data = readPackageJSON();

        const internal = Object.keys(data.dependencies)
            .filter((name) => name.startsWith('@authup/'));

        expect(internal).toEqual(['@authup/kit']);
    });

    it('should declare exactly the five dependencies', () => {
        const data = readPackageJSON();

        expect(Object.keys(data.dependencies).sort()).toEqual(DEPENDENCIES_ALLOWED);
    });

    it('should declare no peer dependencies', () => {
        const data = readPackageJSON();

        expect(data).not.toHaveProperty('peerDependencies');
    });
});
