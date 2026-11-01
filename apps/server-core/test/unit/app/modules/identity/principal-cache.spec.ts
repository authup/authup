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
import type { Repository } from 'typeorm';
import {
    ClientEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { ClientIdentityRepository, UserIdentityRepository } from '../../../../../src/app/modules/identity/index.ts';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeUser } from '../../../../utils';

describe('app/modules/identity/repositories (principal cache fence)', () => {
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

    /**
     * Holds the next cache store until released, so a read whose SELECT saw
     * the pre-commit row stores it only after the write and both of its
     * cache drops have completed.
     */
    function holdNextStore() {
        const cache = suite.dataSource.queryResultCache!;
        const original = cache.storeInCache.bind(cache);

        const { promise: reached, resolve: reach } = Promise.withResolvers<void>();
        const { promise: released, resolve: release } = Promise.withResolvers<void>();

        vi.spyOn(cache, 'storeInCache').mockImplementationOnce(async (...args) => {
            reach();
            await released;

            return original(...args);
        });

        return { reached, release };
    }

    it('does not serve a client fill that straddles its deactivation', async () => {
        const { data: created } = await suite.client.client.create(createFakeClient());
        const repository = new ClientIdentityRepository(suite.dataSource.getRepository(ClientEntity) as Repository<Client>);

        const gate = holdNextStore();
        const pending = repository.findOneById(created.id);

        await gate.reached;

        await suite.client.client.update(created.id, { active: false });

        gate.release();

        const stale = await pending;

        expect(stale?.active).toBe(true);

        const next = await repository.findOneById(created.id);

        expect(next?.active).toBe(false);
    });

    it('does not serve a user fill that straddles its deactivation', async () => {
        const { data: created } = await suite.client.user.create(createFakeUser());
        const repository = new UserIdentityRepository({
            repository: new UserRepository(suite.dataSource),
            userPermissionRepository: suite.dataSource.getRepository(UserPermissionEntity),
            userRoleRepository: suite.dataSource.getRepository(UserRoleEntity),
        });

        const gate = holdNextStore();
        const pending = repository.findOneById(created.id);

        await gate.reached;

        await suite.client.user.update(created.id, { active: false });

        gate.release();

        const stale = await pending;

        expect(stale?.active).toBe(true);

        const next : User | null = await repository.findOneById(created.id);

        expect(next?.active).toBe(false);
    });

    it('serves a second read from the cache', async () => {
        const { data: created } = await suite.client.client.create(createFakeClient());
        const repository = new ClientIdentityRepository(suite.dataSource.getRepository(ClientEntity) as Repository<Client>);

        await repository.findOneById(created.id);

        const store = vi.spyOn(suite.dataSource.queryResultCache!, 'storeInCache');
        const entity = await repository.findOneById(created.id);

        expect(entity?.id).toEqual(created.id);
        expect(store).not.toHaveBeenCalled();
    });
});
