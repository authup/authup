/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { MemoryCache } from '@authup/server-kit';
import type { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions.js';
import { DatabaseQueryResultCache } from '../../../../src/adapters/database/cache/index.ts';

const IDENTIFIER = 'client#p#00000000-0000-4000-8000-000000000001';

function createCache() {
    return new DatabaseQueryResultCache(new MemoryCache(), { fenced: (identifier) => identifier.startsWith('client#p#') });
}

/**
 * The calls typeorm's SelectQueryBuilder.loadRawResults makes: a lookup, and
 * on a miss the store of the freshly read rows, handed what the lookup returned.
 */
async function lookup(cache: DatabaseQueryResultCache, identifier = IDENTIFIER) {
    const saved = await cache.getFromCache({
        identifier, 
        query: 'SELECT', 
        duration: 60_000, 
    });
    const hit = saved && !cache.isExpired(saved) ? saved : undefined;

    return { saved, hit };
}

async function store(
    cache: DatabaseQueryResultCache,
    result: unknown,
    saved: QueryResultCacheOptions | undefined,
    identifier = IDENTIFIER,
) {
    await cache.storeInCache({
        identifier,
        query: 'SELECT',
        time: Date.now(),
        duration: 60_000,
        result: JSON.stringify(result),
    }, saved);
}

describe('adapters/database/cache (generation fence)', () => {
    it('serves a value stored without an invalidation in between', async () => {
        const cache = createCache();

        const first = await lookup(cache);

        expect(first.hit).toBeUndefined();
        await store(cache, [{ active: true }], first.saved);

        const second = await lookup(cache);

        expect(second.hit).toBeDefined();
        expect(JSON.parse(second.hit!.result)).toEqual([{ active: true }]);
    });

    it('never serves a fill whose read started before an invalidation', async () => {
        const cache = createCache();

        // read starts: lookup misses, the SELECT returns the pre-commit row
        const pending = await lookup(cache);

        expect(pending.hit).toBeUndefined();

        // the write commits; the subscriber drops the key in the hook and
        // again after the commit
        await cache.remove([IDENTIFIER]);
        await cache.remove([IDENTIFIER]);

        // the delayed fill lands after both drops
        await store(cache, [{ active: true }], pending.saved);

        const next = await lookup(cache);

        expect(next.hit).toBeUndefined();

        // the next fill reads the committed row and is served from then on
        await store(cache, [{ active: false }], next.saved);

        const last = await lookup(cache);

        expect(last.hit).toBeDefined();
        expect(JSON.parse(last.hit!.result)).toEqual([{ active: false }]);
    });

    it('does not let a stale fill displace the generation of a later read', async () => {
        const cache = createCache();

        const stale = await lookup(cache);

        await cache.remove([IDENTIFIER]);

        const fresh = await lookup(cache);

        await store(cache, [{ active: false }], fresh.saved);
        await store(cache, [{ active: true }], stale.saved);

        const next = await lookup(cache);

        expect(next.hit).toBeUndefined();
    });

    it('does not store a fenced fill that carries no generation', async () => {
        const cache = createCache();

        await store(cache, [{ active: true }], undefined);

        const next = await lookup(cache);

        expect(next.hit).toBeUndefined();
    });

    it('keeps unfenced identifiers on the plain path', async () => {
        const cache = createCache();
        const identifier = 'realm#p#master';

        const first = await lookup(cache, identifier);

        expect(first.saved).toBeUndefined();

        await store(cache, [{ name: 'master' }], first.saved, identifier);

        const second = await lookup(cache, identifier);

        expect(second.hit).toBeDefined();
    });
});
