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

    describe('increment (atomic counter)', () => {
        it('creates an absent key at the increment value', async () => {
            const cache = new MemoryCache();

            expect(await cache.increment('counter')).toBe(1);
            expect(await cache.get('counter')).toBe(1);
        });

        it('returns the post-increment value on every call', async () => {
            const cache = new MemoryCache();

            expect(await cache.increment('counter')).toBe(1);
            expect(await cache.increment('counter')).toBe(2);
            expect(await cache.increment('counter', 3)).toBe(5);
        });

        it('never loses an update under concurrent increments', async () => {
            const cache = new MemoryCache();

            const outputs = await Promise.all(
                Array.from({ length: 10 }, () => cache.increment('counter')),
            );

            expect(await cache.get('counter')).toBe(10);
            expect(new Set(outputs).size).toBe(10);
        });

        it('rejects when the key holds a non-numeric value', async () => {
            const cache = new MemoryCache();
            await cache.set('counter', { count: 1 }, {});

            await expect(cache.increment('counter')).rejects.toThrow();
        });

        it('restarts at zero once the key is dropped', async () => {
            const cache = new MemoryCache();

            await cache.increment('counter');
            await cache.increment('counter');
            await cache.drop('counter');

            expect(await cache.increment('counter')).toBe(1);
        });
    });
});
