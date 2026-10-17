/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PACKAGE_PATH = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function readPackageJSON() : Record<string, any> {
    return JSON.parse(readFileSync(path.join(PACKAGE_PATH, 'package.json'), 'utf8'));
}

// The adapters run inside resource servers (hub, chamberu) and on Web
// runtimes, so they must not inherit server-kit's tail: the native
// @node-rs/jsonwebtoken binding, winston and redis. Verification runs on
// jose, which this package already declares.
const DEPENDENCIES_FORBIDDEN = [
    '@authup/server-kit',
    '@authup/core-kit',
];

describe('package.json', () => {
    it('should not declare @authup/server-kit or @authup/core-kit as a dependency', () => {
        const data = readPackageJSON();

        for (const name of DEPENDENCIES_FORBIDDEN) {
            expect(Object.keys(data.dependencies)).not.toContain(name);
        }
    });
});

describe('src', () => {
    it('should not import @authup/server-kit', () => {
        const directory = path.join(PACKAGE_PATH, 'src');
        const files = readdirSync(directory, { recursive: true, encoding: 'utf8' })
            .filter((file) => file.endsWith('.ts'));

        expect(files.length).toBeGreaterThan(0);

        for (const file of files) {
            const content = readFileSync(path.join(directory, file), 'utf8');
            expect(content, file).not.toMatch(/from '@authup\/server-kit'/);
        }
    });
});
