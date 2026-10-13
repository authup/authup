/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    Client,
    Permission,
    Role,
    UserPermission,
    UserRole,
} from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import type {
    IClientRepository,
    IPermissionRepository,
    IRoleRepository,
    IUserPermissionRepository,
    IUserRoleRepository,
} from '../../../../../src/core/entities/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { UserProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/user/module.ts';
import { FakePathRepository } from '../../entities/path/fake-repository.ts';
import { FakeUserRepository } from '../../entities/user/fake-repository.ts';

describe('core/provisioning/synchronizer/user', () => {
    const realmId = randomUUID();

    let userRepository: FakeUserRepository;
    let pathRepository: FakePathRepository;
    let roleRepository: FakeEntityRepository<Role>;
    let userRoleRepository: FakeEntityRepository<UserRole>;
    let synchronizer: UserProvisioningSynchronizer;

    beforeEach(() => {
        userRepository = new FakeUserRepository();
        pathRepository = new FakePathRepository();
        roleRepository = new FakeEntityRepository<Role>();
        userRoleRepository = new FakeEntityRepository<UserRole>();
        synchronizer = new UserProvisioningSynchronizer({
            userRepository,
            pathRepository,
            userRoleRepository: userRoleRepository as
                FakeEntityRepository<UserRole> & IUserRoleRepository,
            userPermissionRepository: new FakeEntityRepository<UserPermission>() as
                FakeEntityRepository<UserPermission> & IUserPermissionRepository,
            clientRepository: new FakeEntityRepository<Client>() as
                FakeEntityRepository<Client> & IClientRepository,
            roleRepository: roleRepository as
                FakeEntityRepository<Role> & IRoleRepository,
            permissionRepository: new FakeEntityRepository<Permission>() as
                FakeEntityRepository<Permission> & IPermissionRepository,
        });
    });

    it('should file the user under the declared folder and create it on demand', async () => {
        await synchronizer.synchronize({
            attributes: { name: 'alice', realmId },
            relations: { path: 'sales/berlin' },
        });

        const folder = await pathRepository.findOneBy({ realmId, path: 'sales/berlin' });
        expect(folder).not.toBeNull();

        const user = await userRepository.findOneBy({ name: 'alice', realmId });
        expect(user!.pathId).toEqual(folder!.id);
    });
    // A selective merge picks only the listed attributes, and `pathId` is
    // not one an operator writes by hand: declaring the folder is the ask,
    // so it rides the merge anyway (#3632).
    it('should refile an existing user under a selective merge', async () => {
        const existing = userRepository.seed({
            name: 'alice', 
            realmId, 
            displayName: 'Alice', 
        });

        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE, attributes: ['displayName'] },
            attributes: {
                name: 'alice', 
                realmId, 
                displayName: 'Alice B.', 
            },
            relations: { path: 'sales' },
        });

        const folder = await pathRepository.findOneBy({ realmId, path: 'sales' });
        const user = await userRepository.findOneBy({ id: existing.id });
        expect(user!.displayName).toEqual('Alice B.');
        expect(user!.pathId).toEqual(folder!.id);
    });

    it('should create no folder for an existing user under createOnly', async () => {
        const existing = userRepository.seed({ name: 'alice', realmId });

        await synchronizer.synchronize({
            attributes: { name: 'alice', realmId },
            relations: { path: 'sales/berlin' },
        });

        expect(pathRepository.getAll()).toHaveLength(0);

        const user = await userRepository.findOneBy({ id: existing.id });
        expect(user!.pathId ?? null).toBeNull();
    });

    it('should bind no role to an existing user under createOnly', async () => {
        roleRepository.seed({
            name: 'realm_admin',
            realmId: null,
            clientId: null,
        });
        userRepository.seed({ name: 'realm-admin', realmId });

        await synchronizer.synchronize({
            attributes: { name: 'realm-admin', realmId },
            relations: { globalRoles: ['*'] },
        });

        expect(userRoleRepository.getAll()).toHaveLength(0);
    });

    it('should bind the declared role to a user it creates', async () => {
        const role = roleRepository.seed({
            name: 'realm_admin',
            realmId: null,
            clientId: null,
        });

        await synchronizer.synchronize({
            attributes: { name: 'realm-admin', realmId },
            relations: { globalRoles: ['*'] },
        });

        const user = await userRepository.findOneBy({ name: 'realm-admin', realmId });
        expect(userRoleRepository.getAll()).toEqual([
            expect.objectContaining({ userId: user!.id, roleId: role.id }),
        ]);
    });

    it('should bind the declared role to an existing user under merge', async () => {
        const role = roleRepository.seed({
            name: 'realm_admin',
            realmId: null,
            clientId: null,
        });
        const existing = userRepository.seed({ name: 'realm-admin', realmId });

        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE, attributes: ['displayName'] },
            attributes: { name: 'realm-admin', realmId },
            relations: { globalRoles: ['*'] },
        });

        expect(userRoleRepository.getAll()).toEqual([
            expect.objectContaining({ userId: existing.id, roleId: role.id }),
        ]);
    });
});
