/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { EntityType } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import { createNoopLogger } from '@authup/server-kit';
import type { ITaggedCache } from '@rapiq/cache';
import { defineQuery } from '@rapiq/core';
import type { IModule } from 'orkos';
import { RoleEntity } from '../../../../../src/adapters/database/domains/index.ts';
import {
    ConfigModule,
    DatabaseInjectionKey,
    LoggerInjectionKey,
    LoggerModule,
    ModuleName,
    QueryCache,
    TAGGED_CACHE_TTL,
    TaggedCacheInjectionKey,
    createTaggedCache,
} from '../../../../../src/app/index.ts';
import {
    TestApplication,
    createTestDatabaseApplication,
    createTestDatabaseModuleForSuite,
} from '../../../../app';
import { createFakeRole } from '../../../../utils';

type FailingTaggedCache = {
    cache: ITaggedCache,
    /** How many of the next invalidations reject without bumping. */
    fail: (count?: number) => void,
};

function createFailingTaggedCache(): FailingTaggedCache {
    const { cache } = createTaggedCache({ redis: false, onError: () => {} });
    let failures = 0;

    return {
        cache: {
            remember: (key, read, options) => cache.remember(key, read, options),
            invalidate: (tags) => {
                if (failures > 0) {
                    failures--;

                    return Promise.reject(new Error('The cache store is unreachable.'));
                }

                return cache.invalidate(tags);
            },
            drop: (keys) => cache.drop(keys),
        },
        fail: (count = 1) => {
            failures = count;
        },
    };
}

describe('app/modules/database/cache suspension after a lost invalidation (#3688)', () => {
    const suite = createTestDatabaseApplication();

    let tagged: FailingTaggedCache;
    let cache: QueryCache;
    let invalidator: ReturnType<QueryCache['createInvalidator']>;

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    beforeEach(() => {
        // only Date: the store's expiry and the suspension window read the same clock.
        vi.useFakeTimers({ toFake: ['Date'] });

        tagged = createFailingTaggedCache();
        cache = new QueryCache({ dataSource: suite.dataSource, cache: tagged.cache });
        invalidator = cache.createInvalidator();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function advance(ms: number) {
        vi.setSystemTime(Date.now() + ms);
    }

    it('a failed invalidation suspends cached reads for one ttl', async () => {
        const read = vi.fn(async () => 'value');

        await cache.remember('k', () => [EntityType.ROLE], read);
        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        tagged.fail();
        await expect(invalidator.invalidate([EntityType.ROLE])).rejects.toThrow('The cache store is unreachable.');

        await cache.remember('k', () => [EntityType.ROLE], read);
        await cache.rememberQuery({
            key: 'q',
            query: defineQuery({}),
            schema: EntityType.ROLE,
        }, read);
        expect(read).toHaveBeenCalledTimes(3);

        advance(TAGGED_CACHE_TTL - 1);

        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(4);

        advance(1);

        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(5);

        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(5);
    });

    it('a stale entry is not served after a lost bump', async () => {
        let current = 'old';
        const read = vi.fn(async () => current);

        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('old');
        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('old');
        expect(read).toHaveBeenCalledTimes(1);

        current = 'new';
        tagged.fail();
        await expect(invalidator.invalidate([EntityType.ROLE])).rejects.toThrow();

        // the store still holds the old entry under an unbumped tag.
        expect(await tagged.cache.remember('s', read, { tags: () => [EntityType.ROLE] })).toEqual('old');

        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('new');
    });

    it('a second failure extends the suspension', async () => {
        const read = vi.fn(async () => 'value');

        tagged.fail();
        await expect(invalidator.invalidate([EntityType.ROLE])).rejects.toThrow();

        advance(TAGGED_CACHE_TTL / 2);

        tagged.fail();
        await expect(invalidator.invalidate([EntityType.ROLE])).rejects.toThrow();

        advance(TAGGED_CACHE_TTL / 2);

        await cache.remember('e', () => [EntityType.ROLE], read);
        await cache.remember('e', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(2);

        advance(TAGGED_CACHE_TTL / 2);

        await cache.remember('e', () => [EntityType.ROLE], read);
        await cache.remember('e', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(3);
    });

    it('a successful invalidation does not suspend', async () => {
        const read = vi.fn(async () => 'value');

        await invalidator.invalidate([EntityType.ROLE]);

        await cache.remember('o', () => [EntityType.ROLE], read);
        await cache.remember('o', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        await invalidator.invalidate([EntityType.ROLE]);

        await cache.remember('o', () => [EntityType.ROLE], read);
        await cache.remember('o', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(2);
    });
});

describe('app/modules/database/cache suspension on the test application (#3688)', () => {
    const lines: string[] = [];
    const tagged = createFailingTaggedCache();

    // stands in for the cache module, so the database module wires this store.
    const cacheModule: IModule = {
        name: ModuleName.CACHE,
        async setup(container) {
            container.register(TaggedCacheInjectionKey, { useValue: tagged.cache });
        },
        async teardown(container) {
            container.unregister(TaggedCacheInjectionKey);
        },
    };

    const suite = new TestApplication({
        modules: [
            new ConfigModule(),
            new LoggerModule(),
            cacheModule,
            createTestDatabaseModuleForSuite(),
        ],
    });

    beforeAll(async () => {
        const logger = createNoopLogger();

        logger.warn = ((message: unknown) => {
            lines.push(String(message));

            return logger;
        }) as Logger['warn'];

        suite.container.register(LoggerInjectionKey, { useValue: logger });

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('a role save with a lost bump commits, logs once and is not answered from the cache', async () => {
        const cache = suite.container.resolve(DatabaseInjectionKey.QueryCache);
        const read = vi.fn(async () => 'value');

        await cache.remember('e2e', () => [EntityType.ROLE], read);
        await cache.remember('e2e', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        tagged.fail();

        const repository = suite.dataSource.getRepository(RoleEntity);
        const role = await repository.save(createFakeRole());

        expect(await repository.findOneBy({ id: role.id })).not.toBeNull();
        expect(lines.filter((line) => line.startsWith('The cache invalidation failed: '))).toHaveLength(1);

        await cache.remember('e2e', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(2);
    });
});
