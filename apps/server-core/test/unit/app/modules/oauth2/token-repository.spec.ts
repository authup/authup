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
});
