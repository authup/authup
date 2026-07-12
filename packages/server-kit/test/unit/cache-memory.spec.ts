/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { MemoryCache } from '../../src';

describe('src/cache/adapters/memory', () => {
    describe('add (set-if-absent)', () => {
        it('stores the value and returns true when the key is absent', async () => {
            const cache = new MemoryCache();

            expect(await cache.add('lock', 1)).toBe(true);
            expect(await cache.get('lock')).toBe(1);
        });

        it('returns false without overwriting when the key already exists', async () => {
            const cache = new MemoryCache();

            await cache.add('lock', 'first');
            expect(await cache.add('lock', 'second')).toBe(false);
            expect(await cache.get('lock')).toBe('first');
        });

        it('can be re-acquired once the key is dropped', async () => {
            const cache = new MemoryCache();

            expect(await cache.add('lock', 1)).toBe(true);
            expect(await cache.add('lock', 1)).toBe(false);

            await cache.drop('lock');
            expect(await cache.add('lock', 1)).toBe(true);
        });
    });
});
