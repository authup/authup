/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { randomUUID } from 'node:crypto';
import { EntityType, IdentityType } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import type { Policy, Realm } from '@authup/core-kit';
import { BuiltInPolicyType } from '@authup/access';
import { defineQuery } from '@rapiq/core';
import { CacheInvalidationSubscriber } from '@rapiq/cache/typeorm';
import {
    ClientEntity,
    ConsentEntity,
    PermissionEntity,
    PolicyRepository,
    RealmEntity,
    RoleEntity,
    SessionEntity,
    UserEntity,
    UserRoleEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import {
    CacheModule,
    ConfigModule,
    DatabaseInjectionKey,
    LoggerModule,
    PermissionDatabaseProvider,
    PolicyRepositoryAdapter,
} from '../../../../../src/app/index.ts';
import { ConsentRepositoryAdapter } from '../../../../../src/app/modules/oauth2/repositories/index.ts';
import type { IQueryCache } from '../../../../../src/app/index.ts';
import {
    TestApplication,
    createTestApplication,
    createTestDatabaseApplication,
    createTestDatabaseModuleForSuite,
} from '../../../../app';
import {
    createFakeClient,
    createFakePermission,
    createFakeRealm,
    createFakeRole,
    createFakeUser,
} from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';
import type { Logger } from '@authup/server-kit';
import { DomainEventPublisher, createNoopLogger } from '@authup/server-kit';
import { LoggerInjectionKey } from '../../../../../src/app/modules/logger/index.ts';

describe('app/modules/database/cache (#3688)', () => {
    const suite = createTestApplication();
    let cache : IQueryCache;
    let master : Realm;

    beforeAll(async () => {
        await suite.setup();
        cache = suite.container.resolve(DatabaseInjectionKey.QueryCache);
        master = await suite.dataSource.getRepository(RealmEntity).findOneByOrFail({ name: 'master' });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createUser() {
        return suite.dataSource.getRepository(UserEntity).save(createFakeUser({ realmId: master.id }));
    }

    async function createRole() {
        return suite.dataSource.getRepository(RoleEntity).save(createFakeRole());
    }

    it('a repository save bumps the collection tag', async () => {
        const read = vi.fn(async () => 'value');

        await cache.remember('k', () => [EntityType.ROLE], read);
        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        await createRole();

        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(2);
    });

    it('a session save bumps nothing, a role save still does', async () => {
        const sessionRead = vi.fn(async () => 'value');
        const roleRead = vi.fn(async () => 'value');

        await cache.remember('untracked-session', () => [EntityType.SESSION], sessionRead);
        await cache.remember('untracked-role', () => [EntityType.ROLE], roleRead);

        const repository = suite.dataSource.getRepository(SessionEntity);

        await repository.save(repository.create({
            sub: randomUUID(),
            subKind: OAuth2SubKind.USER,
            realmId: master.id,
            ipAddress: '203.0.113.10',
            userAgent: 'test-agent',
            expiresAt: new Date(Date.now() + 100_000).toISOString(),
        }));

        await cache.remember('untracked-session', () => [EntityType.SESSION], sessionRead);
        await cache.remember('untracked-role', () => [EntityType.ROLE], roleRead);
        expect(sessionRead).toHaveBeenCalledTimes(1);
        expect(roleRead).toHaveBeenCalledTimes(1);

        await createRole();

        await cache.remember('untracked-role', () => [EntityType.ROLE], roleRead);
        expect(roleRead).toHaveBeenCalledTimes(2);
    });

    it('a rolled-back transaction bumps nothing', async () => {
        const read = vi.fn(async () => 'value');

        await cache.remember('r', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        await expect(suite.dataSource.transaction(async (manager) => {
            await manager.getRepository(RoleEntity).save(createFakeRole());

            throw new Error('rollback');
        })).rejects.toThrow('rollback');

        await cache.remember('r', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);
    });

    it('a read inside an open transaction is not stored', async () => {
        const read = vi.fn(async () => 'value');

        await suite.dataSource.transaction(async (manager) => {
            await cache.remember('t', () => [EntityType.ROLE], read, { manager });
            await cache.remember('t', () => [EntityType.ROLE], read, { manager });
        });
        expect(read).toHaveBeenCalledTimes(2);

        await cache.remember('t', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(3);
    });

    it('a read inside a transaction without its manager bypasses the cache on better-sqlite3 only', async () => {
        const read = vi.fn(async () => 'value');

        await suite.dataSource.transaction(async () => {
            await cache.remember('s', () => [EntityType.ROLE], read);
            await cache.remember('s', () => [EntityType.ROLE], read);
        });

        if (suite.dataSource.options.type === 'better-sqlite3') {
            // the one shared runner is inside the transaction, so nothing was stored.
            expect(read).toHaveBeenCalledTimes(2);

            await cache.remember('s', () => [EntityType.ROLE], read);
            expect(read).toHaveBeenCalledTimes(3);
        } else {
            // another pooled connection reads, so the second call is served from the cache.
            expect(read).toHaveBeenCalledTimes(1);
        }
    });

    it('rememberQuery scopes a grant list to its owner', async () => {
        const owner = await createUser();
        const other = await createUser();
        const role = await createRole();

        const read = vi.fn(async () => [] as UserRoleEntity[]);
        const input = {
            key: `userRole?userId=${owner.id}`,
            query: defineQuery({ filters: { userId: owner.id } }),
            schema: EntityType.USER_ROLE,
            caseSensitive: ['userId'],
        };

        await cache.rememberQuery(input, read);
        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(1);

        const repository = suite.dataSource.getRepository(UserRoleEntity);

        await repository.save(repository.create({
            userId: other.id,
            userRealmId: master.id,
            roleId: role.id,
            roleRealmId: null,
        }));

        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(1);

        await repository.save(repository.create({
            userId: owner.id,
            userRealmId: master.id,
            roleId: role.id,
            roleRealmId: null,
        }));

        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(2);
    });

    it('a junction row saved with an upper-case owner id drops the entry scoped to the lower-case id', async () => {
        const owner = await createUser();
        const role = await createRole();

        const read = vi.fn(async () => [] as UserRoleEntity[]);
        const input = {
            key: `userRole?userId=${owner.id}`,
            query: defineQuery({ filters: { userId: owner.id } }),
            schema: EntityType.USER_ROLE,
            caseSensitive: ['userId'],
        };

        await cache.rememberQuery(input, read);
        await cache.rememberQuery(input, read);
        expect(read).toHaveBeenCalledTimes(1);

        const repository = suite.dataSource.getRepository(UserRoleEntity);
        // sqlite compares a foreign key as text and would refuse the upper-case spelling.
        const isSqlite = suite.dataSource.options.type === 'better-sqlite3';

        if (isSqlite) {
            await suite.dataSource.query('PRAGMA foreign_keys = OFF');
        }

        try {
            const row = await repository.save(repository.create({
                userId: owner.id.toUpperCase(),
                userRealmId: master.id,
                roleId: role.id,
                roleRealmId: null,
            }));

            await cache.rememberQuery(input, read);
            expect(read).toHaveBeenCalledTimes(2);

            await repository.delete({ id: row.id });
        } finally {
            if (isSqlite) {
                await suite.dataSource.query('PRAGMA foreign_keys = ON');
            }
        }
    });

    it('policy attribute writes bump policyAttribute', async () => {
        const read = vi.fn(async () => 'value');

        await cache.remember('p', () => [EntityType.POLICY_ATTRIBUTE], read);
        await cache.remember('p', () => [EntityType.POLICY_ATTRIBUTE], read);
        expect(read).toHaveBeenCalledTimes(1);

        const adapter = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(suite.dataSource),
            realmRepository: suite.dataSource.getRepository(RealmEntity),
        });
        const {
            start,
            end,
            invert,
            ...data
        } = createFakeTimePolicy({ realmId: master.id });
        const input : Partial<Policy> = { ...data, type: BuiltInPolicyType.TIME };
        const entity = adapter.create(input);

        await adapter.saveWithEA(entity, {
            start,
            end,
            invert,
        });

        await cache.remember('p', () => [EntityType.POLICY_ATTRIBUTE], read);
        expect(read).toHaveBeenCalledTimes(2);
    });

    it('findOne distinguishes an unfiltered owner from a global one', async () => {
        const realm = await suite.dataSource.getRepository(RealmEntity).save(createFakeRealm());
        const permission = await suite.dataSource.getRepository(PermissionEntity)
            .save(createFakePermission({ realmId: realm.id }));
        const provider = new PermissionDatabaseProvider(suite.dataSource, cache);

        expect((await provider.findOne({ name: permission.name }))?.permission.realmId).toEqual(realm.id);
        expect(await provider.findOne({ name: permission.name, realmId: null })).toBeNull();
    });

    it('a consent grant is visible on the next covering read', async () => {
        const user = await createUser();
        const client = await suite.dataSource.getRepository(ClientEntity).save(createFakeClient({ realmId: master.id }));
        const consents = new ConsentRepositoryAdapter(suite.dataSource, cache);
        const owner = { sub: user.id, subKind: IdentityType.USER };

        expect(await consents.findAllBySubjectClient(client.id, owner)).toEqual([]);

        await consents.insertMissing({
            clientId: client.id,
            realmId: master.id,
            owner,
            scopes: ['openid'],
        });

        expect((await consents.findAllBySubjectClient(client.id, owner)).map((row) => row.scope)).toEqual(['openid']);
    });

    it('a consent grant is visible on a covering read asked with an upper-case client id', async () => {
        const user = await createUser();
        const client = await suite.dataSource.getRepository(ClientEntity).save(createFakeClient({ realmId: master.id }));
        const consents = new ConsentRepositoryAdapter(suite.dataSource, cache);
        const owner = { sub: user.id, subKind: IdentityType.USER };
        const clientId = client.id.toUpperCase();

        expect(await consents.findAllBySubjectClient(clientId, owner)).toEqual([]);

        await consents.insertMissing({
            clientId: client.id,
            realmId: master.id,
            owner,
            scopes: ['openid'],
        });

        expect((await consents.findAllBySubjectClient(clientId, owner)).map((row) => row.scope)).toEqual(['openid']);
    });

    it('a consent fill that straddles a revocation is never served', async () => {
        const user = await createUser();
        const client = await suite.dataSource.getRepository(ClientEntity).save(createFakeClient({ realmId: master.id }));
        const consents = new ConsentRepositoryAdapter(suite.dataSource, cache);
        const owner = { sub: user.id, subKind: IdentityType.USER };

        await consents.insertMissing({
            clientId: client.id,
            realmId: master.id,
            owner,
            scopes: ['openid'],
        });

        const repository = suite.dataSource.getRepository(ConsentEntity);
        const createQueryBuilder = repository.createQueryBuilder.bind(repository);
        const spy = vi.spyOn(repository, 'createQueryBuilder').mockImplementationOnce((alias) => {
            const qb = createQueryBuilder(alias);
            const getMany = qb.getMany.bind(qb);

            qb.getMany = async () => {
                const stale = await getMany();

                await repository.remove(await repository.findBy({ clientId: client.id }));

                return stale;
            };

            return qb;
        });

        expect(await consents.findAllBySubjectClient(client.id, owner)).toHaveLength(1);

        spy.mockRestore();

        expect(await consents.findAllBySubjectClient(client.id, owner)).toEqual([]);
    });
});

describe('app/modules/database/cache without a cache module (#3688)', () => {
    const suite = createTestDatabaseApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('without a cache module every call reads', async () => {
        const cache = suite.container.resolve(DatabaseInjectionKey.QueryCache);
        const read = vi.fn(async () => 'value');

        await cache.remember('k', () => [EntityType.ROLE], read);
        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(2);

        expect(suite.dataSource.subscribers.some((subscriber) => subscriber instanceof CacheInvalidationSubscriber)).toBe(false);
    });
});

describe('app/modules/database/cache with the cache module registered last (#3688)', () => {
    const suite = new TestApplication({
        modules: [
            new ConfigModule(),
            new LoggerModule(),
            createTestDatabaseModuleForSuite(),
            new CacheModule(),
        ],
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('the database module still wires the cache', async () => {
        const cache = suite.container.resolve(DatabaseInjectionKey.QueryCache);
        const read = vi.fn(async () => 'value');

        await cache.remember('k', () => [EntityType.ROLE], read);
        await cache.remember('k', () => [EntityType.ROLE], read);
        expect(read).toHaveBeenCalledTimes(1);

        expect(suite.dataSource.subscribers.some((subscriber) => subscriber instanceof CacheInvalidationSubscriber)).toBe(true);
    });
});

describe('app/modules/database/cache with an unreachable redis (#3688)', () => {
    const lines: string[] = [];
    const suite = createTestApplication({
        config: (config) => {
            config.redis = 'redis://127.0.0.1:1';
        },
    });

    beforeAll(async () => {
        const logger = createNoopLogger();

        logger.warn = ((message: unknown) => {
            lines.push(String(message));

            return logger;
        }) as Logger['warn'];

        suite.container.register(LoggerInjectionKey, { useValue: logger });

        await suite.setup();

        // the domain-event bus queues its Redis commands through an outage, which is not the cache's commit path.
        const publisher = suite.container.resolve(DatabaseInjectionKey.DomainEventPublisher);

        if (!(publisher instanceof DomainEventPublisher)) {
            throw new TypeError('The domain event publisher is not a DomainEventPublisher.');
        }

        await publisher.dispose();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('a save commits without waiting on the cache and logs one line', async () => {
        const repository = suite.dataSource.getRepository(RoleEntity);

        const startedAt = Date.now();
        const role = await repository.save(createFakeRole());
        const elapsed = Date.now() - startedAt;

        await repository.save(createFakeRole());

        expect(elapsed).toBeLessThan(2000);
        expect(await repository.findOneBy({ id: role.id })).not.toBeNull();
        expect(lines.filter((line) => line.startsWith('The cache invalidation failed: '))).toHaveLength(1);
    });
});
