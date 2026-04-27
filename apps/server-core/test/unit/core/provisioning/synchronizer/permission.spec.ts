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
import { PermissionProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/permission/module.ts';
import type { PermissionProvisioningEntity } from '../../../../../src/core/provisioning/entities/permission/types.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakePolicyRepository } from '../../helpers/fake-policy-repository.ts';
import type { IPermissionPolicyRepository } from '../../../../../src/core/entities/permission-policy/types.ts';
import type { IPermissionRepository } from '../../../../../src/core/entities/index.ts';

describe('core/provisioning/synchronizer/permission', () => {
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

    describe('basic synchronization', () => {
        it('should create a new permission when not present', async () => {
            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                },
            };

            await synchronizer.synchronize(input);

            const all = permissionRepository.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].name).toBe('test_permission');
            expect(all[0].built_in).toBe(true);
        });

        it('should not create duplicates on re-sync', async () => {
            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
            };

            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);

            expect(permissionRepository.getAll()).toHaveLength(1);
        });

        it('should remove the permission when strategy is ABSENT', async () => {
            permissionRepository.seed({
                name: 'test_permission',
                realm_id: null,
                client_id: null,
            });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.ABSENT },
                attributes: {
                    name: 'test_permission',
                    realm_id: null,
                    client_id: null,
                },
            };

            await synchronizer.synchronize(input);

            expect(permissionRepository.getAll()).toHaveLength(0);
        });
    });

    describe('policy attachment via relations.policies', () => {
        it('should attach declared policies to a newly-created permission', async () => {
            const policy = policyRepository.seed({ name: 'system.test-policy' });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.test-policy'] },
            };

            await synchronizer.synchronize(input);

            const permission = permissionRepository.getAll()[0];
            expect(permission).toBeDefined();

            const junctions = permissionPolicyRepository.getAll();
            expect(junctions).toHaveLength(1);
            expect(junctions[0].permission_id).toBe(permission.id);
            expect(junctions[0].policy_id).toBe(policy.id);
        });

        it('should attach multiple declared policies', async () => {
            const policyA = policyRepository.seed({ name: 'system.policy-a' });
            const policyB = policyRepository.seed({ name: 'system.policy-b' });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.policy-a', 'system.policy-b'] },
            };

            await synchronizer.synchronize(input);

            const junctions = permissionPolicyRepository.getAll();
            const policyIds = junctions.map((j) => j.policy_id).sort();
            expect(policyIds).toEqual([policyA.id, policyB.id].sort());
        });

        it('should be idempotent — not create duplicate junctions on re-sync', async () => {
            policyRepository.seed({ name: 'system.test-policy' });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.test-policy'] },
            };

            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);

            expect(permissionPolicyRepository.getAll()).toHaveLength(1);
        });

        it('should add new policies on top of existing junctions on subsequent syncs', async () => {
            policyRepository.seed({ name: 'system.policy-a' });
            policyRepository.seed({ name: 'system.policy-b' });

            await synchronizer.synchronize({
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.policy-a'] },
            });

            expect(permissionPolicyRepository.getAll()).toHaveLength(1);

            await synchronizer.synchronize({
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.policy-a', 'system.policy-b'] },
            });

            expect(permissionPolicyRepository.getAll()).toHaveLength(2);
        });

        it('should set permission_realm_id and policy_realm_id on the junction', async () => {
            policyRepository.seed({
                name: 'system.test-policy',
                realm_id: 'policy-realm',
            });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: 'permission-realm',
                    client_id: null,
                },
                relations: { policies: ['system.test-policy'] },
            };

            await synchronizer.synchronize(input);

            const junction = permissionPolicyRepository.getAll()[0];
            expect(junction.permission_realm_id).toBe('permission-realm');
            expect(junction.policy_realm_id).toBe('policy-realm');
        });

        it('should throw when a referenced policy is not provisioned', async () => {
            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.missing-policy'] },
            };

            await expect(synchronizer.synchronize(input)).rejects.toThrow(/policy 'system.missing-policy' not found/);
        });

        it('should throw when policyRepository is not wired but policies are declared', async () => {
            const synchronizerWithoutRepos = new PermissionProvisioningSynchronizer({ repository: permissionRepository });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: ['system.test-policy'] },
            };

            await expect(synchronizerWithoutRepos.synchronize(input)).rejects.toThrow(/repositories must be wired/);
        });

        it('should not require policy/permissionPolicy repositories when no relations are declared', async () => {
            const synchronizerWithoutRepos = new PermissionProvisioningSynchronizer({ repository: permissionRepository });

            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
            };

            await expect(synchronizerWithoutRepos.synchronize(input)).resolves.toBeDefined();
        });

        it('should not attach policies when relations.policies is an empty array', async () => {
            const input: PermissionProvisioningEntity = {
                strategy: { type: ProvisioningEntityStrategyType.MERGE },
                attributes: {
                    name: 'test_permission',
                    built_in: true,
                    realm_id: null,
                    client_id: null,
                },
                relations: { policies: [] },
            };

            await synchronizer.synchronize(input);

            expect(permissionPolicyRepository.getAll()).toHaveLength(0);
        });
    });
});
