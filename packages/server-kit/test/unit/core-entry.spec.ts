/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
const ENTRY = path.join(DIST, 'core.mjs');

const FORBIDDEN = [
    'redis-extension',
    'ioredis',
    '@socket.io/redis-emitter',
    '@node-rs/bcrypt',
    '@node-rs/jsonwebtoken',
    'winston',
];

function collectSpecifiers(file: string, seen = new Set<string>()): Set<string> {
    const specifiers = new Set<string>();

    if (seen.has(file)) {
        return specifiers;
    }

    seen.add(file);

    const content = readFileSync(file, 'utf8');
    const pattern = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

    for (const match of content.matchAll(pattern)) {
        const specifier = match[1] ?? match[2] ?? match[3]!;

        if (specifier.startsWith('.')) {
            for (const nested of collectSpecifiers(path.resolve(path.dirname(file), specifier), seen)) {
                specifiers.add(nested);
            }
        } else {
            specifiers.add(specifier);
        }
    }

    return specifiers;
}

describe.skipIf(!existsSync(ENTRY))('@authup/server-kit/core entry', () => {
    it('loads none of the redis, socket.io, native or logger dependencies', () => {
        const specifiers = [...collectSpecifiers(ENTRY)];

        expect(specifiers.length).toBeGreaterThan(0);
        expect(specifiers.filter((specifier) => FORBIDDEN.some(
            (name) => specifier === name || specifier.startsWith(`${name}/`),
        ))).toEqual([]);
    });

    it('is exported as its own entry', () => {
        const pkg = JSON.parse(readFileSync(path.join(DIST, '..', 'package.json'), 'utf8'));

        expect(pkg.exports['./core']).toEqual({
            types: './dist/core/index.d.ts',
            import: './dist/core.mjs',
        });
        expect(existsSync(path.join(DIST, 'core', 'index.d.ts'))).toBe(true);
    });
});

if (!existsSync(ENTRY)) {
    process.stderr.write('core-entry.spec: dist/core.mjs is absent, build the package to run it.\n');
}
