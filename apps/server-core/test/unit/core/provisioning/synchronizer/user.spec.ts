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
import { UserProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/user/module.ts';
import { FakePathRepository } from '../../entities/path/fake-repository.ts';
import { FakeUserRepository } from '../../entities/user/fake-repository.ts';

describe('core/provisioning/synchronizer/user', () => {
    const realmId = randomUUID();

    let userRepository: FakeUserRepository;
    let pathRepository: FakePathRepository;
    let synchronizer: UserProvisioningSynchronizer;

    beforeEach(() => {
        userRepository = new FakeUserRepository();
        pathRepository = new FakePathRepository();
        synchronizer = new UserProvisioningSynchronizer({
            userRepository,
            pathRepository,
            userRoleRepository: new FakeEntityRepository<UserRole>() as
                FakeEntityRepository<UserRole> & IUserRoleRepository,
            userPermissionRepository: new FakeEntityRepository<UserPermission>() as
                FakeEntityRepository<UserPermission> & IUserPermissionRepository,
            clientRepository: new FakeEntityRepository<Client>() as
                FakeEntityRepository<Client> & IClientRepository,
            roleRepository: new FakeEntityRepository<Role>() as
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
});
