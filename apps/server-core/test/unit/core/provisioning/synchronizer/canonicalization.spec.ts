/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, PermissionPolicy } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { FakeEntityRepository } from '@authup/server-test-kit';
import { PermissionProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/permission/module.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { FakePolicyRepository } from '../../entities/policy/fake-repository.ts';
import type { IPermissionPolicyRepository } from '../../../../../src/core/entities/permission-policy/types.ts';
import type { IPermissionRepository } from '../../../../../src/core/entities/index.ts';

describe('core/provisioning/synchronizer canonical names', () => {
    let permissionRepository: FakeEntityRepository<Permission> & IPermissionRepository;
    let policyRepository: FakePolicyRepository;
    let permissionPolicyRepository: FakeEntityRepository<PermissionPolicy> & IPermissionPolicyRepository;
    let synchronizer: PermissionProvisioningSynchronizer;

    beforeEach(() => {
        permissionRepository = new FakeEntityRepository<Permission>() as
            FakeEntityRepository<Permission> & IPermissionRepository;
        policyRepository = new FakePolicyRepository();
        permissionPolicyRepository = new FakeEntityRepository<PermissionPolicy>() as
            FakeEntityRepository<PermissionPolicy> & IPermissionPolicyRepository;
        synchronizer = new PermissionProvisioningSynchronizer({
            repository: permissionRepository,
            policyRepository,
            permissionPolicyRepository,
        });
    });

    it('should persist a canonical name for a mixed-case provisioned entity', async () => {
        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE },
            attributes: { name: ' Test_Permission ' },
        });

        const all = permissionRepository.getAll();
        expect(all).toHaveLength(1);
        expect(all[0].name).toBe('test_permission');
    });

    it('should match an existing canonical row for a mixed-case provisioned entity', async () => {
        permissionRepository.seed({
            name: 'test_permission', 
            realmId: null, 
            clientId: null, 
        });

        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE },
            attributes: { name: ' Test_Permission ' },
        });

        expect(permissionRepository.getAll()).toHaveLength(1);
    });

    it('should resolve a mixed-case policy reference against the canonical row', async () => {
        policyRepository.seed({ name: 'system.default' });

        await synchronizer.synchronize({
            strategy: { type: ProvisioningEntityStrategyType.MERGE },
            attributes: { name: 'test_permission' },
            relations: { policies: [' System.Default '] },
        });

        expect(permissionPolicyRepository.getAll()).toHaveLength(1);
    });
});
