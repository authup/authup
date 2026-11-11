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
import type { Realm } from '@authup/core-kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    PermissionEntity,
    RealmEntity,
    RoleEntity,
    RolePermissionEntity,
    UserEntity,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import {
    ClientRepositoryAdapter,
    DatabaseInjectionKey,
    IdentityInjectionKey,
    RoleRepositoryAdapter,
    UserRepositoryAdapter,
    UserRoleRepositoryAdapter,
} from '../../../../../src/app/index.ts';
import { UserRoleService } from '../../../../../src/core/index.ts';
import { createTestApplication } from '../../../../app';
import {
    createFakeClient,
    createFakePermission,
    createFakeRole,
    createFakeUser,
} from '../../../../utils';

describe('app/modules/database/repositories grant lists (#3688)', () => {
    const suite = createTestApplication();

    let master : Realm;
    let users : UserRepositoryAdapter;
    let clients : ClientRepositoryAdapter;
    let roles : RoleRepositoryAdapter;

    beforeAll(async () => {
        await suite.setup();

        const { dataSource } = suite;
        const cache = suite.container.resolve(DatabaseInjectionKey.QueryCache);

        master = await dataSource.getRepository(RealmEntity).findOneByOrFail({ name: 'master' });

        users = new UserRepositoryAdapter({
            repository: new UserRepository(dataSource),
            realmRepository: dataSource.getRepository(RealmEntity),
        }, cache);
        clients = new ClientRepositoryAdapter({
            repository: dataSource.getRepository(ClientEntity),
            realmRepository: dataSource.getRepository(RealmEntity),
        }, cache);
        roles = new RoleRepositoryAdapter({
            repository: dataSource.getRepository(RoleEntity),
            realmRepository: dataSource.getRepository(RealmEntity),
        }, cache);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createUser() {
        return suite.dataSource.getRepository(UserEntity).save(createFakeUser({ realmId: master.id }));
    }

    async function createClient() {
        return suite.dataSource.getRepository(ClientEntity).save(createFakeClient({ realmId: master.id }));
    }

    async function createRole() {
        return suite.dataSource.getRepository(RoleEntity).save(createFakeRole());
    }

    async function createPermission() {
        return suite.dataSource.getRepository(PermissionEntity).save(createFakePermission());
    }

    async function assignUserRole(userId: string, roleId: string) {
        const repository = suite.dataSource.getRepository(UserRoleEntity);

        return repository.save(repository.create({
            userId,
            userRealmId: master.id,
            roleId,
            roleRealmId: null,
        }));
    }

    async function renameRole(id: string) {
        const repository = suite.dataSource.getRepository(RoleEntity);
        const role = await repository.findOneByOrFail({ id });

        role.name = `${role.name}x`;

        return repository.save(role);
    }

    async function editPermission(id: string) {
        const repository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await repository.findOneByOrFail({ id });

        permission.displayName = `edited ${permission.id}`;

        return repository.save(permission);
    }

    it('a role rename is visible on the next getBoundRoles (user)', async () => {
        const user = await createUser();
        const role = await createRole();

        await assignUserRole(user.id, role.id);

        expect((await users.getBoundRoles(user.id)).map((entry) => entry.name)).toEqual([role.name]);

        const renamed = await renameRole(role.id);

        expect((await users.getBoundRoles(user.id)).map((entry) => entry.name)).toEqual([renamed.name]);
    });

    it('a role rename is visible on the next getBoundRoles (client)', async () => {
        const client = await createClient();
        const role = await createRole();
        const repository = suite.dataSource.getRepository(ClientRoleEntity);

        await repository.save(repository.create({
            clientId: client.id,
            clientRealmId: master.id,
            roleId: role.id,
            roleRealmId: null,
        }));

        expect((await clients.getBoundRoles(client.id)).map((entry) => entry.name)).toEqual([role.name]);

        const renamed = await renameRole(role.id);

        expect((await clients.getBoundRoles(client.id)).map((entry) => entry.name)).toEqual([renamed.name]);
    });

    it('a permission edit is visible on the next getBoundPermissions (user)', async () => {
        const user = await createUser();
        const permission = await createPermission();
        const repository = suite.dataSource.getRepository(UserPermissionEntity);

        await repository.save(repository.create({
            userId: user.id,
            userRealmId: master.id,
            permissionId: permission.id,
            permissionRealmId: null,
        }));

        expect((await users.getBoundPermissions(user.id))[0].permission).toMatchObject({ displayName: permission.displayName });

        const edited = await editPermission(permission.id);

        expect((await users.getBoundPermissions(user.id))[0].permission).toMatchObject({ displayName: edited.displayName });
    });

    it('a permission edit is visible on the next getBoundPermissions (client)', async () => {
        const client = await createClient();
        const permission = await createPermission();
        const repository = suite.dataSource.getRepository(ClientPermissionEntity);

        await repository.save(repository.create({
            clientId: client.id,
            clientRealmId: master.id,
            permissionId: permission.id,
            permissionRealmId: null,
        }));

        expect((await clients.getBoundPermissions(client.id))[0].permission).toMatchObject({ displayName: permission.displayName });

        const edited = await editPermission(permission.id);

        expect((await clients.getBoundPermissions(client.id))[0].permission).toMatchObject({ displayName: edited.displayName });
    });

    it('a permission edit is visible on the next getBoundPermissions (role)', async () => {
        const role = await createRole();
        const permission = await createPermission();
        const repository = suite.dataSource.getRepository(RolePermissionEntity);

        await repository.save(repository.create({
            roleId: role.id,
            roleRealmId: null,
            permissionId: permission.id,
            permissionRealmId: null,
        }));

        expect((await roles.getBoundPermissions(role.id))[0].permission).toMatchObject({ displayName: permission.displayName });

        const edited = await editPermission(permission.id);

        expect((await roles.getBoundPermissions(role.id))[0].permission).toMatchObject({ displayName: edited.displayName });
    });

    it('a grant list survives a junction write for another owner', async () => {
        const owner = await createUser();
        const other = await createUser();
        const role = await createRole();

        await assignUserRole(owner.id, role.id);

        const find = vi.spyOn(suite.dataSource.manager.getRepository(UserRoleEntity), 'find');

        expect(await users.getBoundRoles(owner.id)).toHaveLength(1);

        await assignUserRole(other.id, role.id);

        expect(await users.getBoundRoles(owner.id)).toHaveLength(1);
        expect(find).toHaveBeenCalledTimes(1);
    });

    it('a grant list is dropped by a junction write for its owner', async () => {
        const owner = await createUser();
        const first = await createRole();
        const second = await createRole();

        await assignUserRole(owner.id, first.id);

        expect(await users.getBoundRoles(owner.id)).toHaveLength(1);

        await assignUserRole(owner.id, second.id);

        expect(await users.getBoundRoles(owner.id)).toHaveLength(2);
    });

    it('removing the owner\'s assignment empties the list', async () => {
        const owner = await createUser();
        const role = await createRole();
        const assignment = await assignUserRole(owner.id, role.id);

        expect(await users.getBoundRoles(owner.id)).toHaveLength(1);

        await suite.dataSource.getRepository(UserRoleEntity).remove(assignment);

        expect(await users.getBoundRoles(owner.id)).toHaveLength(0);
    });

    it('a fill that straddles a revocation of the owner\'s assignment is never served', async () => {
        const owner = await createUser();
        const role = await createRole();
        const assignment = await assignUserRole(owner.id, role.id);
        const repository = suite.dataSource.manager.getRepository(UserRoleEntity);
        const find = repository.find.bind(repository);

        vi.spyOn(repository, 'find').mockImplementationOnce(async (options) => {
            const stale = await find(options);

            await repository.remove(assignment);

            return stale;
        });

        expect(await users.getBoundRoles(owner.id)).toHaveLength(1);
        expect(await users.getBoundRoles(owner.id)).toHaveLength(0);
    });

    it('a fill that straddles a revocation of a role permission is never served', async () => {
        const role = await createRole();
        const permission = await createPermission();
        const repository = suite.dataSource.manager.getRepository(RolePermissionEntity);
        const assignment = await repository.save(repository.create({
            roleId: role.id,
            roleRealmId: null,
            permissionId: permission.id,
            permissionRealmId: null,
        }));
        const find = repository.find.bind(repository);

        vi.spyOn(repository, 'find').mockImplementationOnce(async (options) => {
            const stale = await find(options);

            await repository.remove(assignment);

            return stale;
        });

        expect(await roles.getBoundPermissions(role.id)).toHaveLength(1);
        expect(await roles.getBoundPermissions(role.id)).toHaveLength(0);
    });

    it('an upper-case owner id reads the same entry', async () => {
        const owner = await createUser();
        const role = await createRole();

        await assignUserRole(owner.id, role.id);

        const find = vi.spyOn(suite.dataSource.manager.getRepository(UserRoleEntity), 'find');

        expect(await users.getBoundRoles(owner.id)).toHaveLength(1);
        expect(await users.getBoundRoles(owner.id.toUpperCase())).toHaveLength(1);
        expect(find).toHaveBeenCalledTimes(1);
    });

    it('a grant assigned with an upper-case owner id is visible on the next read', async () => {
        const owner = await createUser();
        const first = await createRole();
        const second = await createRole();

        await assignUserRole(owner.id, first.id);

        expect((await users.getBoundRoles(owner.id)).map((entry) => entry.id)).toEqual([first.id]);

        const service = new UserRoleService({
            repository: new UserRoleRepositoryAdapter(suite.dataSource.getRepository(UserRoleEntity)),
            identityPermissionProvider: suite.container.resolve(IdentityInjectionKey.PermissionProvider),
        });

        await service.create({ userId: owner.id.toUpperCase(), roleId: second.id }, createAllowAllActor());

        expect((await users.getBoundRoles(owner.id)).map((entry) => entry.id).sort()).toEqual([first.id, second.id].sort());
    });
});
