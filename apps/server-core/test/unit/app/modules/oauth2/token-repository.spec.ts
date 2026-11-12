/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { CacheSetOptions } from '@authup/server-kit';
import { MemoryCache } from '@authup/server-kit';
import { describe, expect, it } from 'vitest';
import { OAuth2TokenRepository } from '../../../../../src/app/modules/oauth2/repositories/token/repository.ts';

function record(cache: MemoryCache) {
    const calls : CacheSetOptions[] = [];
    const set = cache.set.bind(cache);

    cache.set = async (key, value, options) => {
        calls.push(options ?? {});

        return set(key, value, options);
    };

    return calls;
}

describe('OAuth2TokenRepository', () => {
    it('should keep a disabled key mark for the longest token lifetime', async () => {
        const cache = new MemoryCache();
        const calls = record(cache);
        const kid = randomUUID();

        await new OAuth2TokenRepository(cache, { keyInactiveMaxAge: 259_200 }).setKeyInactive(kid);

        expect(calls[0].ttl).toEqual(259_200 * 1000);
    });

    it('should keep a disabled key mark at least as long as the claims fallback', async () => {
        const cache = new MemoryCache();
        const calls = record(cache);
        const repository = new OAuth2TokenRepository(cache, { keyInactiveMaxAge: 60 });
        const kid = randomUUID();

        await repository.setKeyInactive(kid);
        expect(calls[0].ttl).toEqual(3_600 * 1000);
        expect(await repository.isKeyInactive(kid)).toBe(true);

        await repository.dropKeyInactive(kid);
        expect(await repository.isKeyInactive(kid)).toBe(false);
    });

    it('should fail the blocklist lookup with the backend instead of reading a revoked token as live', async () => {
        const cache = new MemoryCache();
        const repository = new OAuth2TokenRepository(cache);
        const jti = randomUUID();

        await repository.setInactive(jti);
        expect(await repository.isInactive(jti)).toBe(true);
        expect(await repository.isInactive(randomUUID())).toBe(false);

        // what the redis adapter does while redis is unreachable: a value
        // read answers a miss, every other command rejects
        cache.get = async () => null;
        cache.has = async () => {
            throw new Error('Connection is closed.');
        };

        await expect(repository.isInactive(jti)).rejects.toThrow('Connection is closed.');
    });
});
