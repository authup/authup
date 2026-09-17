/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Permission, Role } from '@authup/core-kit';
import { FakeEntityRepository, createMasterRealmActor } from '@authup/server-test-kit';
import { describe, expect, it } from 'vitest';
import { ClientPermissionService } from '../../../../src/core/entities/client-permission/service.ts';
import { ClientRoleService } from '../../../../src/core/entities/client-role/service.ts';
import { IdentityProviderRoleMappingService } from '../../../../src/core/entities/identity-provider-role-mapping/service.ts';
import { RolePermissionService } from '../../../../src/core/entities/role-permission/service.ts';
import { UserPermissionService } from '../../../../src/core/entities/user-permission/service.ts';
import { UserRoleService } from '../../../../src/core/entities/user-role/service.ts';
import { FakeIdentityPermissionProvider } from '../helpers/fake-identity-permission-provider.ts';

/**
 * Every junction service delegates the ACTOR's grants (#3597), so each one must
 * check the grants the actor's request resolved, which for a token are the
 * grants that token carries. Resolving them afresh from the actor's identity
 * would compile just as well and silently let a token issued to one client
 * delegate another client's grants: this table catches that, one row per call
 * site.
 */
describe('core/entities (junction delegation checks the actor grants)', () => {
    const grants = [{ permission: { name: 'custom_perm', clientId: randomUUID() } }];
    const actor = () => ({ ...createMasterRealmActor(), grants: async () => grants });

    type Case = [string, (provider: FakeIdentityPermissionProvider) => Promise<unknown>];

    const permissionJunction = (
        Service: typeof UserPermissionService | typeof ClientPermissionService | typeof RolePermissionService,
        owner: 'user' | 'client' | 'role',
    ) : Case[] => [
        [`${owner}-permission create`, async (provider) => {
            const repository = new FakeEntityRepository<any>();
            repository.onValidateJoinColumns((data: any) => {
                data.permission = { name: 'custom_perm', realmId: null };
                data[owner] = { realmId: null };
            });
            const service = new Service({
                repository, 
                permissionRepository: new FakeEntityRepository<Permission>(), 
                identityPermissionProvider: provider, 
            });

            return service.create({ [`${owner}Id`]: randomUUID(), permissionId: randomUUID() }, actor());
        }],
        [`${owner}-permission update`, async (provider) => {
            const repository = new FakeEntityRepository<any>();
            const permissionRepository = new FakeEntityRepository<Permission>();
            const permission = permissionRepository.seed({ name: 'custom_perm', realmId: null });
            const entity = repository.seed({ permissionId: permission.id, policyId: null });
            const service = new Service({
                repository, 
                permissionRepository, 
                identityPermissionProvider: provider, 
            });

            return service.update(entity.id, { policyId: null }, actor());
        }],
    ];

    const roleJunction = (Service: typeof UserRoleService | typeof ClientRoleService, owner: 'user' | 'client') : Case => [
        `${owner}-role create`,
        async (provider) => {
            const repository = new FakeEntityRepository<any>();
            repository.onValidateJoinColumns((data: any) => {
                data.role = { realmId: null, clientId: null };
                data[owner] = { realmId: null };
            });
            const service = new Service({ repository, identityPermissionProvider: provider });

            return service.create({ [`${owner}Id`]: randomUUID(), roleId: randomUUID() }, actor());
        },
    ];

    const cases : Case[] = [
        ...permissionJunction(UserPermissionService, 'user'),
        ...permissionJunction(ClientPermissionService, 'client'),
        ...permissionJunction(RolePermissionService, 'role'),
        roleJunction(UserRoleService, 'user'),
        roleJunction(ClientRoleService, 'client'),
        ['identity-provider-role-mapping create', async (provider) => {
            const repository = new FakeEntityRepository<any>();
            repository.onValidateJoinColumns((data: any) => {
                data.provider = { realmId: null };
                data.role = { realmId: null, clientId: null };
            });
            const service = new IdentityProviderRoleMappingService({
                repository,
                roleRepository: new FakeEntityRepository<Role>(),
                identityPermissionProvider: provider,
            });

            return service.create({ providerId: randomUUID(), roleId: randomUUID() }, actor());
        }],
        ['identity-provider-role-mapping update', async (provider) => {
            const repository = new FakeEntityRepository<any>();
            const roleRepository = new FakeEntityRepository<Role>();
            const role = roleRepository.seed({ clientId: null } as Partial<Role>);
            const entity = repository.seed({
                providerId: randomUUID(),
                roleId: role.id,
                name: 'old',
            });
            const service = new IdentityProviderRoleMappingService({
                repository, 
                roleRepository, 
                identityPermissionProvider: provider, 
            });

            return service.update(entity.id, { name: 'new' }, actor());
        }],
    ];

    it.each(cases)('%s', async (_name, run) => {
        const provider = new FakeIdentityPermissionProvider();

        await run(provider);

        expect(provider.delegatedGrants).toEqual([grants]);
        expect(provider.delegatedGrants[0]).toBe(grants);
    });
});
