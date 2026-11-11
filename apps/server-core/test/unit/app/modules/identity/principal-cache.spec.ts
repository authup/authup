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
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { Client, User } from '@authup/core-kit';
import type { ITaggedCache } from '@rapiq/cache';
import type { Repository } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import {
    ClientEntity,
    RealmEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import type { IQueryCache } from '../../../../../src/app/index.ts';
import {
    DatabaseInjectionKey,
    QueryCache,
    TaggedCacheInjectionKey,
} from '../../../../../src/app/index.ts';
import { ClientIdentityRepository, UserIdentityRepository } from '../../../../../src/app/modules/identity/index.ts';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeRealm, createFakeUser } from '../../../../utils';

describe('app/modules/identity/repositories (principal cache, #3688)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function createClientRepository(cache: IQueryCache) {
        return new ClientIdentityRepository(
            suite.dataSource.getRepository(ClientEntity) as Repository<Client>,
            cache,
        );
    }

    function createUserRepository(cache: IQueryCache) {
        return new UserIdentityRepository({
            repository: new UserRepository(suite.dataSource),
            userPermissionRepository: suite.dataSource.getRepository(UserPermissionEntity),
            userRoleRepository: suite.dataSource.getRepository(UserRoleEntity),
            cache,
        });
    }

    /**
     * Holds the next fill between its database read and its store, so the
     * read saw the pre-commit row and tries to store it only after the write
     * committed.
     */
    function createHoldingCache() {
        const tagged = suite.container.resolve(TaggedCacheInjectionKey);

        const { promise: reached, resolve: reach } = Promise.withResolvers<void>();
        const { promise: released, resolve: release } = Promise.withResolvers<void>();
        let held = false;

        const holding : ITaggedCache = {
            remember: (key, read, options) => tagged.remember(key, async () => {
                const value = await read();

                if (!held) {
                    held = true;
                    reach();
                    await released;
                }

                return value;
            }, options),
            invalidate: (tags) => tagged.invalidate(tags),
            drop: (keys) => tagged.drop(keys),
        };

        return {
            cache: new QueryCache({ dataSource: suite.dataSource, cache: holding }),
            reached,
            release,
        };
    }

    it('a client fill that straddles deactivation is not served afterwards', async () => {
        const { data: created } = await suite.client.client.create(createFakeClient());
        const gate = createHoldingCache();
        const repository = createClientRepository(gate.cache);

        const pending = repository.findOneById(created.id);

        await gate.reached;

        await suite.client.client.update(created.id, { active: false });

        gate.release();

        const stale = await pending;

        expect(stale?.active).toBe(true);

        const next = await repository.findOneById(created.id);

        expect(next?.active).toBe(false);
    });

    it('a user fill that straddles deactivation is not served afterwards', async () => {
        const { data: created } = await suite.client.user.create(createFakeUser());
        const gate = createHoldingCache();
        const repository = createUserRepository(gate.cache);

        const pending = repository.findOneById(created.id);

        await gate.reached;

        await suite.client.user.update(created.id, { active: false });

        gate.release();

        const stale = await pending;

        expect(stale?.active).toBe(true);

        const next : User | null = await repository.findOneById(created.id);

        expect(next?.active).toBe(false);
    });

    it('a second read is served from the cache', async () => {
        const { data: created } = await suite.client.client.create(createFakeClient());
        const repository = createClientRepository(suite.container.resolve(DatabaseInjectionKey.QueryCache));

        await repository.findOneById(created.id);

        const getOne = vi.spyOn(SelectQueryBuilder.prototype, 'getOne');
        const entity = await repository.findOneById(created.id);

        expect(entity?.id).toEqual(created.id);
        expect(getOne).not.toHaveBeenCalled();
    });

    it('a realm rename is visible on the next identity read', async () => {
        const realms = suite.dataSource.getRepository(RealmEntity);
        const realm = await realms.save(realms.create(createFakeRealm()));
        const { data: created } = await suite.client.user.create(createFakeUser({ realmId: realm.id }));
        const repository = createUserRepository(suite.container.resolve(DatabaseInjectionKey.QueryCache));

        expect((await repository.findOneById(created.id))?.realm?.name).toEqual(realm.name);

        realm.name = `${realm.name}x`;
        await realms.save(realm);

        expect((await repository.findOneById(created.id))?.realm?.name).toEqual(realm.name);
    });
});
