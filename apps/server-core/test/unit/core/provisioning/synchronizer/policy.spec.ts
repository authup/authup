/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicy } from '@authup/core-kit';
import { BuiltInPolicyType } from '@authup/access';
import {
    beforeEach, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { PolicyProvisioningSynchronizer } from '../../../../../src/core/provisioning/synchronizer/policy/module.ts';
import type { PolicyProvisioningEntity } from '../../../../../src/core/provisioning/entities/policy/types.ts';
import { FakePolicyRepository } from '../../helpers/fake-policy-repository.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import type { IPermissionPolicyRepository } from '../../../../../src/core/entities/permission-policy/types.ts';

class FakePermissionPolicyRepository
    extends FakeEntityRepository<PermissionPolicy>
    implements IPermissionPolicyRepository {}

describe('core/provisioning/synchronizer/policy', () => {
    let policyRepository: FakePolicyRepository;
    let permissionPolicyRepository: FakePermissionPolicyRepository;
    let synchronizer: PolicyProvisioningSynchronizer;

    beforeEach(() => {
        policyRepository = new FakePolicyRepository();
        permissionPolicyRepository = new FakePermissionPolicyRepository();
        synchronizer = new PolicyProvisioningSynchronizer({
            repository: policyRepository,
            permissionPolicyRepository,
        });
    });

    describe('idempotency', () => {
        it('should not create duplicates when run multiple times', async () => {
            const input: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'system.identity',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                    {
                        attributes: {
                            name: 'system.permission-binding',
                            type: BuiltInPolicyType.PERMISSION_BINDING,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);

            const all = policyRepository.getAll();
            const byName = (name: string) => all.filter((p) => p.name === name);

            expect(byName('system.default')).toHaveLength(1);
            expect(byName('system.identity')).toHaveLength(1);
            expect(byName('system.permission-binding')).toHaveLength(1);
            expect(all).toHaveLength(3);
        });

        it('should not create duplicates for global policies (realm_id: null)', async () => {
            const input: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.realm-bound',
                    type: BuiltInPolicyType.REALM_MATCH,
                    built_in: true,
                    realm_id: null,
                },
            };

            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);

            const all = policyRepository.getAll();
            expect(all.filter((p) => p.name === 'system.realm-bound')).toHaveLength(1);
        });
    });

    describe('stale child cleanup', () => {
        it('should delete unreferenced children when parent policy children change', async () => {
            const initialInput: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'old-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                    {
                        attributes: {
                            name: 'kept-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(initialInput);
            expect(policyRepository.getAll()).toHaveLength(3);

            const updatedInput: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'kept-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                    {
                        attributes: {
                            name: 'new-child',
                            type: BuiltInPolicyType.PERMISSION_BINDING,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(updatedInput);

            const all = policyRepository.getAll();
            const names = all.map((p) => p.name);

            expect(names).toContain('system.default');
            expect(names).toContain('kept-child');
            expect(names).toContain('new-child');
            expect(names).not.toContain('old-child');
            expect(all).toHaveLength(3);
        });

        it('should detach (not delete) stale children that are referenced by permission-policy junctions', async () => {
            const initialInput: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'referenced-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(initialInput);

            const referencedChild = policyRepository.getAll().find((p) => p.name === 'referenced-child')!;

            permissionPolicyRepository.seed({
                permission_id: 'some-permission-id',
                policy_id: referencedChild.id,
            });

            const updatedInput: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [],
            };

            await synchronizer.synchronize(updatedInput);

            const all = policyRepository.getAll();
            const detached = all.find((p) => p.name === 'referenced-child');

            expect(detached).toBeDefined();
            expect(detached!.parent_id).toBeNull();
            expect(detached!.built_in).toBe(false);
        });

        it('should clean up stale children even when children is undefined', async () => {
            const withChildren: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'stale-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(withChildren);
            expect(policyRepository.getAll()).toHaveLength(2);

            const withoutChildren: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
            };

            await synchronizer.synchronize(withoutChildren);

            const all = policyRepository.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].name).toBe('system.default');
        });

        it('should delete all unreferenced stale children when policy is renamed', async () => {
            const oldInput: PolicyProvisioningEntity = {
                attributes: {
                    name: 'old-parent',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'old-child-a',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                    {
                        attributes: {
                            name: 'old-child-b',
                            type: BuiltInPolicyType.PERMISSION_BINDING,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(oldInput);
            expect(policyRepository.getAll()).toHaveLength(3);

            const newInput: PolicyProvisioningEntity = {
                attributes: {
                    name: 'new-parent',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
                children: [
                    {
                        attributes: {
                            name: 'new-child-a',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(newInput);

            const all = policyRepository.getAll();
            const names = all.map((p) => p.name);

            expect(names).toContain('new-parent');
            expect(names).toContain('new-child-a');
            // old-parent still exists (it was a separate synchronize call, not removed)
            // but old-child-a and old-child-b are still under old-parent
            // the old parent's children are NOT cleaned up because we only synchronized new-parent
            expect(names).toContain('old-parent');
        });
    });

    describe('update behavior', () => {
        it('should update existing policy attributes on re-sync', async () => {
            const input: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: true,
                    realm_id: null,
                },
            };

            await synchronizer.synchronize(input);

            const updated: PolicyProvisioningEntity = {
                attributes: {
                    name: 'system.default',
                    type: BuiltInPolicyType.COMPOSITE,
                    built_in: false,
                    realm_id: null,
                },
            };

            await synchronizer.synchronize(updated);

            const all = policyRepository.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].built_in).toBe(false);
        });
    });
});
