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
import {
    MemoryCacheDriver,
    TaggedCache,
    collectQueryTags,
    isCacheError,
} from '@rapiq/cache';
import { defineQuery } from '@rapiq/core';
import type { IModule } from 'orkos';
import { DataSource } from 'typeorm';
import { RoleEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { schemaRegistry } from '../../../../../src/core/index.ts';
import {
    ConfigModule,
    DatabaseInjectionKey,
    LoggerInjectionKey,
    LoggerModule,
    ModuleName,
    QUERY_CACHE_SCOPED_VALUE_NORMALIZER,
    QueryCache,
    TAGGED_CACHE_TTL,
    TaggedCacheInjectionKey,
} from '../../../../../src/app/index.ts';
import {
    TestApplication,
    createTestDatabaseModuleForSuite,
} from '../../../../app/index.ts';
import { createFakeRole } from '../../../../utils/index.ts';

class UnreachableMemoryCacheDriver extends MemoryCacheDriver {
    /** While set, every bump rejects without touching the store. */
    down = false;

    override async invalidate(tags: string[]): Promise<void> {
        if (this.down) {
            throw new Error('The cache store is unreachable.');
        }

        return super.invalidate(tags);
    }
}

function createTaggedCache() {
    const driver = new UnreachableMemoryCacheDriver({ maxTtl: TAGGED_CACHE_TTL });
    const cache = new TaggedCache({ driver, ttl: TAGGED_CACHE_TTL });

    return { driver, cache };
}

const ROLE_QUERY = defineQuery({});

function collectRoleQueryTags(): string[] {
    return collectQueryTags({
        query: ROLE_QUERY,
        schema: EntityType.ROLE,
        registry: schemaRegistry,
        value: [],
        normalizeScopedValue: QUERY_CACHE_SCOPED_VALUE_NORMALIZER,
    });
}

describe('app/modules/database/cache after a lost invalidation (#3688)', () => {
    // never initialized: the cache reads only its transaction state.
    const dataSource = new DataSource({ type: 'better-sqlite3', database: ':memory:' });

    let driver: UnreachableMemoryCacheDriver;
    let tagged: TaggedCache;
    let cache: QueryCache;
    let invalidator: ReturnType<QueryCache['createInvalidator']>;

    beforeEach(() => {
        ({ driver, cache: tagged } = createTaggedCache());
        cache = new QueryCache({ dataSource, cache: tagged });
        invalidator = cache.createInvalidator();
    });

    afterEach(() => {
        tagged.dispose();
    });

    it('a failed invalidation rejects naming its tags and keeps them pending', async () => {
        driver.down = true;

        const error = await invalidator.invalidate([EntityType.ROLE]).catch((e: unknown) => e);

        expect(isCacheError(error)).toBe(true);
        expect(isCacheError(error) ? error.tags : []).toEqual([EntityType.ROLE]);
        expect(tagged.pendingInvalidations).toEqual([EntityType.ROLE]);
    });

    it('a stale entry is neither served nor refilled while its tag is pending', async () => {
        let current = 'old';
        const read = vi.fn(async () => current);

        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('old');
        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('old');
        expect(read).toHaveBeenCalledTimes(1);

        current = 'new';
        driver.down = true;
        await expect(invalidator.invalidate([EntityType.ROLE])).rejects.toThrow();

        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('new');
        expect(await cache.remember('s', () => [EntityType.ROLE], read)).toEqual('new');
        expect(read).toHaveBeenCalledTimes(3);
    });

    it('a query read carrying a pending tag reads through', async () => {
        const read = vi.fn(async () => []);
        const input = {
            key: 'q', 
            query: ROLE_QUERY, 
            schema: EntityType.ROLE, 
        };

        await cache.rememberQuery(input, read);
        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(1);

        driver.down = true;
        await expect(invalidator.invalidate(collectRoleQueryTags())).rejects.toThrow();

        await cache.rememberQuery(input, read);
        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(3);
    });

    it('the next bump replays the lost one and the cache serves again', async () => {
        const read = vi.fn(async () => 'value');

        driver.down = true;
        await expect(invalidator.invalidate([EntityType.ROLE])).rejects.toThrow();

        driver.down = false;
        await invalidator.invalidate([EntityType.USER]);
        expect(tagged.pendingInvalidations).toEqual([]);

        await cache.remember('r', () => [EntityType.ROLE], read);
        await cache.remember('r', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);
    });

    it('a successful invalidation leaves nothing pending', async () => {
        const read = vi.fn(async () => 'value');

        await invalidator.invalidate([EntityType.ROLE]);
        expect(tagged.pendingInvalidations).toEqual([]);

        await cache.remember('o', () => [EntityType.ROLE], read);
        await cache.remember('o', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        await invalidator.invalidate([EntityType.ROLE]);

        await cache.remember('o', () => [EntityType.ROLE], read);
        await cache.remember('o', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(2);
    });
});

describe('app/modules/database/cache after a lost invalidation on the test application (#3688)', () => {
    const lines: string[] = [];
    const { driver, cache: tagged } = createTaggedCache();

    // stands in for the cache module, so the database module wires this store.
    const cacheModule: IModule = {
        name: ModuleName.CACHE,
        async setup(container) {
            container.register(TaggedCacheInjectionKey, { useValue: tagged });
        },
        async teardown(container) {
            container.unregister(TaggedCacheInjectionKey);
            tagged.dispose();
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
        const read = vi.fn(async () => []);
        const input = {
            key: 'e2e', 
            query: ROLE_QUERY, 
            schema: EntityType.ROLE, 
        };

        await cache.rememberQuery(input, read);
        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(1);

        driver.down = true;

        const repository = suite.dataSource.getRepository(RoleEntity);
        const role = await repository.save(createFakeRole());

        expect(await repository.findOneBy({ id: role.id })).not.toBeNull();

        const warnings = lines.filter((line) => line.startsWith('The cache invalidation failed'));

        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toMatch(new RegExp(`^ {2}tags: +(.+, )?${EntityType.ROLE}(,|$| \\()`, 'm'));
        expect(warnings[0]).toMatch(/^ {2}cause: +.*The cache store is unreachable\./m);
        expect(warnings[0]).not.toContain(role.name);
        expect(tagged.pendingInvalidations).toEqual(expect.arrayContaining(collectRoleQueryTags()));

        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(2);
    });
});
