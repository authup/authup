/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Permission, RolePermission } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { RoleProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/role/module.ts';
import type { RoleProvisioningEntity } from '../../../../../src/core/provisioning/entities/role/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import type { IPermissionRepository, IRolePermissionRepository } from '../../../../../src/core/entities/index.ts';
import { FakeClientRepository } from '../../entities/client/fake-repository.ts';
import { FakePolicyRepository } from '../../entities/policy/fake-repository.ts';
import { FakeRoleRepository } from '../../entities/role/fake-repository.ts';

describe('core/provisioning/synchronizer/role', () => {
    let roleRepository: FakeRoleRepository;
    let permissionRepository: FakeEntityRepository<Permission>;
    let rolePermissionRepository: FakeEntityRepository<RolePermission>;
    let policyRepository: FakePolicyRepository;
    let synchronizer: RoleProvisioningSynchronizer;
    const realmId = randomUUID();

    beforeEach(() => {
        roleRepository = new FakeRoleRepository();
        policyRepository = new FakePolicyRepository();
        permissionRepository = new FakeEntityRepository<Permission>();
        rolePermissionRepository = new FakeEntityRepository<RolePermission>();
        synchronizer = new RoleProvisioningSynchronizer({
            repository: roleRepository,
            clientRepository: new FakeClientRepository(),
            policyRepository,
            permissionRepository: permissionRepository as
                FakeEntityRepository<Permission> & IPermissionRepository,
            rolePermissionRepository: rolePermissionRepository as
                FakeEntityRepository<RolePermission> & IRolePermissionRepository,
        });

        permissionRepository.seed({
            name: 'realm_update',
            realmId: null,
            clientId: null,
        });
    });

    function buildInput(strategy?: ProvisioningEntityStrategyType) : RoleProvisioningEntity {
        return {
            ...(strategy ? { strategy: { type: strategy } } : {}),
            attributes: { name: 'ops', realmId },
            relations: { globalPermissions: ['*'] },
        } as RoleProvisioningEntity;
    }

    it('should bind no permission to an existing role under createOnly', async () => {
        roleRepository.seed({
            name: 'ops',
            realmId,
            clientId: null,
        });

        await synchronizer.synchronize(buildInput());

        expect(rolePermissionRepository.getAll()).toHaveLength(0);
    });

    it('should bind the declared permission to a role it creates', async () => {
        await synchronizer.synchronize(buildInput());

        const stored = await roleRepository.findOneBy({ name: 'ops', realmId });

        expect(rolePermissionRepository.getAll()).toEqual([
            expect.objectContaining({ roleId: stored!.id }),
        ]);
    });

    it('should bind the declared permission to an existing role under merge', async () => {
        const existing = roleRepository.seed({
            name: 'ops',
            realmId,
            clientId: null,
        });

        await synchronizer.synchronize(buildInput(ProvisioningEntityStrategyType.MERGE));

        expect(rolePermissionRepository.getAll()).toEqual([
            expect.objectContaining({ roleId: existing.id }),
        ]);
    });

    it('should bind the declared permission to an existing built-in role under createOnly', async () => {
        const existing = roleRepository.seed({
            name: 'ops',
            realmId,
            clientId: null,
            builtIn: true,
        });

        await synchronizer.synchronize(buildInput());

        expect(rolePermissionRepository.getAll()).toEqual([
            expect.objectContaining({ roleId: existing.id }),
        ]);
    });

    it('should stamp the named global policy and reach on every generated binding', async () => {
        const policy = policyRepository.seed({ name: 'p', realmId: null });

        await synchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: {
                globalPermissions: ['*'],
                globalPermissionsRealmScope: 'own',
                globalPermissionsPolicy: 'p',
            },
        } as RoleProvisioningEntity);

        expect(rolePermissionRepository.getAll()).toEqual([
            expect.objectContaining({ realmScope: 'own', policyId: policy.id }),
        ]);
    });

    it('should refuse an unknown policy name', async () => {
        await expect(synchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: {
                globalPermissions: ['*'],
                globalPermissionsRealmScope: 'own',
                globalPermissionsPolicy: 'missing',
            },
        } as RoleProvisioningEntity)).rejects.toThrow(/missing/);
    });

    it('should stamp the named policy when no reach is declared', async () => {
        const policy = policyRepository.seed({ name: 'p', realmId: null });

        await synchronizer.synchronize({
            attributes: { name: 'ops', realmId },
            relations: {
                globalPermissions: ['*'],
                globalPermissionsPolicy: 'p',
            },
        } as RoleProvisioningEntity);

        expect(rolePermissionRepository.getAll()).toEqual([
            expect.objectContaining({ policyId: policy.id }),
        ]);
    });
});
