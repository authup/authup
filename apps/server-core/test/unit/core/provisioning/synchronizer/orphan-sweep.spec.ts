/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientPermission,
    Permission,
    PermissionPolicy,
    RobotPermission,
    Role,
    RolePermission,
    Scope,
    UserPermission,
} from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OrphanSweepSynchronizer } from '../../../../../src/core/provisioning/synchronizer/orphan-sweep/module.ts';
import type { RootProvisioningEntity } from '../../../../../src/core/provisioning/entities/root/index.ts';
import { ProvisioningEntityStrategyType } from '../../../../../src/core/provisioning/strategy/index.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakePolicyRepository } from '../../helpers/fake-policy-repository.ts';
import type { IPermissionPolicyRepository } from '../../../../../src/core/entities/permission-policy/types.ts';
import type { IPermissionRepository, IRoleRepository } from '../../../../../src/core/entities/index.ts';
import type { IScopeRepository } from '../../../../../src/core/entities/scope/types.ts';

describe('core/provisioning/synchronizer/orphan-sweep', () => {
    let policyRepository: FakePolicyRepository;
    let permissionRepository: FakeEntityRepository<Permission> & IPermissionRepository;
    let permissionPolicyRepository: FakeEntityRepository<PermissionPolicy> & IPermissionPolicyRepository;
    let rolePermissionRepository: FakeEntityRepository<RolePermission>;
    let userPermissionRepository: FakeEntityRepository<UserPermission>;
    let clientPermissionRepository: FakeEntityRepository<ClientPermission>;
    let robotPermissionRepository: FakeEntityRepository<RobotPermission>;
    let roleRepository: FakeEntityRepository<Role> & IRoleRepository;
    let scopeRepository: FakeEntityRepository<Scope> & IScopeRepository;

    beforeEach(() => {
        policyRepository = new FakePolicyRepository();
        permissionRepository = new FakeEntityRepository<Permission>() as
            FakeEntityRepository<Permission> & IPermissionRepository;
        permissionPolicyRepository = new FakeEntityRepository<PermissionPolicy>() as
            FakeEntityRepository<PermissionPolicy> & IPermissionPolicyRepository;
        rolePermissionRepository = new FakeEntityRepository<RolePermission>();
        userPermissionRepository = new FakeEntityRepository<UserPermission>();
        clientPermissionRepository = new FakeEntityRepository<ClientPermission>();
        robotPermissionRepository = new FakeEntityRepository<RobotPermission>();
        roleRepository = new FakeEntityRepository<Role>() as FakeEntityRepository<Role> & IRoleRepository;
        scopeRepository = new FakeEntityRepository<Scope>() as FakeEntityRepository<Scope> & IScopeRepository;
    });

    function build(defaultPolicyName?: string) {
        return new OrphanSweepSynchronizer({
            policyRepository,
            permissionRepository,
            permissionPolicyRepository,
            rolePermissionRepository: rolePermissionRepository as any,
            userPermissionRepository: userPermissionRepository as any,
            clientPermissionRepository: clientPermissionRepository as any,
            robotPermissionRepository: robotPermissionRepository as any,
            roleRepository,
            scopeRepository,
            defaultPolicyName,
        });
    }

    function declared(overrides: Partial<RootProvisioningEntity> = {}): RootProvisioningEntity {
        return {
            policies: [],
            permissions: [],
            roles: [],
            scopes: [],
            ...overrides,
        };
    }

    describe('policies', () => {
        it('should remove orphan top-level built-in policies', async () => {
            policyRepository.seed({
                name: 'system.kept',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });

            const result = await build().sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.kept', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual(['system.removed']);
            expect(policyRepository.getAll().map((p) => p.name)).toEqual(['system.kept']);
        });

        it('should not remove non-built-in policies', async () => {
            policyRepository.seed({
                name: 'custom.policy',
                built_in: false,
                realm_id: null,
                parent_id: null,
            });

            const result = await build().sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.something', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual([]);
            expect(policyRepository.getAll()).toHaveLength(1);
        });

        it('should not sweep policies when declared set is empty (safety guard)', async () => {
            policyRepository.seed({
                name: 'system.kept',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });

            const result = await build().sweep(declared({ policies: [] }));

            expect(result.policies).toEqual([]);
            expect(policyRepository.getAll()).toHaveLength(1);
        });

        it('should not touch realm-scoped policies', async () => {
            policyRepository.seed({
                name: 'system.realm-bound',
                built_in: true,
                realm_id: 'realm-A',
                parent_id: null,
            });

            const result = await build().sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.something', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual([]);
            expect(policyRepository.getAll()).toHaveLength(1);
        });

        it('should not touch child policies (parent_id set)', async () => {
            policyRepository.seed({
                name: 'system.identity',
                built_in: true,
                realm_id: null,
                parent_id: 'parent-id',
            });

            const result = await build().sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.default', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual([]);
            expect(policyRepository.getAll()).toHaveLength(1);
        });

        it('should re-attach the FULL declared policy set when a permission policy was orphaned', async () => {
            const orphan = policyRepository.seed({
                name: 'system.user-self-manage-fields',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const defaultPolicy = policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const namesPolicy = policyRepository.seed({
                name: 'system.user-names-self-manage',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'user_self_manage',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphan.id,
                policy_realm_id: null,
            });

            await build('system.default').sweep(declared({
                policies: [
                    {
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: {
                            name: 'system.default', 
                            built_in: true, 
                            realm_id: null, 
                        },
                    },
                    {
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: {
                            name: 'system.user-names-self-manage', 
                            built_in: true, 
                            realm_id: null, 
                        },
                    },
                ],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'user_self_manage', built_in: true },
                    relations: { policies: ['system.default', 'system.user-names-self-manage'] },
                }],
            }));

            const reattached = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id)
                .map((j) => j.policy_id)
                .sort();
            expect(reattached).toEqual([defaultPolicy.id, namesPolicy.id].sort());
        });

        it('should fall back to system.default if permission has no declared policies', async () => {
            const orphan = policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const defaultPolicy = policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'something_action',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphan.id,
                policy_realm_id: null,
            });

            await build('system.default').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.default', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_action', built_in: true },
                    // no relations.policies
                }],
            }));

            const reattached = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id);
            expect(reattached).toHaveLength(1);
            expect(reattached[0].policy_id).toBe(defaultPolicy.id);
        });
    });

    describe('permissions', () => {
        it('should remove orphan global built-in permissions', async () => {
            permissionRepository.seed({
                name: 'kept_action',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionRepository.seed({
                name: 'removed_action',
                built_in: true,
                realm_id: null,
                client_id: null,
            });

            const result = await build().sweep(declared({
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'kept_action', built_in: true },
                }],
            }));

            expect(result.permissions).toEqual(['removed_action']);
            expect(permissionRepository.getAll().map((p) => p.name)).toEqual(['kept_action']);
        });

        it('should not sweep when declared set is empty (safety guard)', async () => {
            permissionRepository.seed({
                name: 'orphan_action',
                built_in: true,
                realm_id: null,
                client_id: null,
            });

            const result = await build().sweep(declared({ permissions: [] }));

            expect(result.permissions).toEqual([]);
            expect(permissionRepository.getAll()).toHaveLength(1);
        });
    });

    describe('roles', () => {
        it('should remove orphan global built-in roles', async () => {
            roleRepository.seed({
                name: 'admin',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            roleRepository.seed({
                name: 'legacy_role',
                built_in: true,
                realm_id: null,
                client_id: null,
            });

            const result = await build().sweep(declared({
                roles: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'admin', built_in: true },
                }],
            }));

            expect(result.roles).toEqual(['legacy_role']);
            expect(roleRepository.getAll().map((r) => r.name)).toEqual(['admin']);
        });
    });

    describe('scopes', () => {
        it('should remove orphan global built-in scopes', async () => {
            scopeRepository.seed({
                name: 'openid',
                built_in: true,
                realm_id: null,
            });
            scopeRepository.seed({
                name: 'legacy_scope',
                built_in: true,
                realm_id: null,
            });

            const result = await build().sweep(declared({
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'openid', built_in: true },
                }],
            }));

            expect(result.scopes).toEqual(['legacy_scope']);
            expect(scopeRepository.getAll().map((s) => s.name)).toEqual(['openid']);
        });

        it('should not touch realm-scoped scopes', async () => {
            scopeRepository.seed({
                name: 'realm-scope',
                built_in: true,
                realm_id: 'realm-A',
            });

            const result = await build().sweep(declared({
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something', built_in: true },
                }],
            }));

            expect(result.scopes).toEqual([]);
            expect(scopeRepository.getAll()).toHaveLength(1);
        });
    });

    describe('reassignment edge cases', () => {
        it('should NOT reassign when permission still has remaining policies after sweep', async () => {
            const orphan = policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const survivor = policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'something_action',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphan.id,
                policy_realm_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: survivor.id,
                policy_realm_id: null,
            });

            await build('system.default').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.default', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_action', built_in: true },
                    relations: { policies: ['system.default'] },
                }],
            }));

            const remaining = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].policy_id).toBe(survivor.id);
        });

        it('should reassign exactly once even when multiple orphan policies affected the same permission', async () => {
            const orphanA = policyRepository.seed({
                name: 'system.orphan-a',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const orphanB = policyRepository.seed({
                name: 'system.orphan-b',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const defaultPolicy = policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const namesPolicy = policyRepository.seed({
                name: 'system.user-names-self-manage',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'user_self_manage',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphanA.id,
                policy_realm_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphanB.id,
                policy_realm_id: null,
            });

            await build('system.default').sweep(declared({
                policies: [
                    {
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: {
                            name: 'system.default', 
                            built_in: true, 
                            realm_id: null, 
                        },
                    },
                    {
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: {
                            name: 'system.user-names-self-manage', 
                            built_in: true, 
                            realm_id: null, 
                        },
                    },
                ],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'user_self_manage', built_in: true },
                    relations: { policies: ['system.default', 'system.user-names-self-manage'] },
                }],
            }));

            const reattached = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id)
                .map((j) => j.policy_id)
                .sort();
            expect(reattached).toEqual([defaultPolicy.id, namesPolicy.id].sort());
        });

        it('should leave permission with zero policies if no defaultPolicyName and no declared policies', async () => {
            const orphan = policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'orphan_consumer',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphan.id,
                policy_realm_id: null,
            });

            await build(/* no defaultPolicyName */).sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.something', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            const remaining = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id);
            expect(remaining).toHaveLength(0);
        });

        it('should leave permission with zero policies if defaultPolicyName provided but the policy does not exist', async () => {
            const orphan = policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'orphan_consumer',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphan.id,
                policy_realm_id: null,
            });

            // defaultPolicyName references a policy that's not seeded
            await build('system.does-not-exist').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.something', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            const remaining = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id);
            expect(remaining).toHaveLength(0);
        });

        it('should skip declared policies in reassignment that do not exist in DB (graceful)', async () => {
            const orphan = policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const defaultPolicy = policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            // Note: 'system.missing' is declared but not seeded
            const permission = permissionRepository.seed({
                name: 'something_action',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                permission_realm_id: null,
                policy_id: orphan.id,
                policy_realm_id: null,
            });

            await build('system.default').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.default', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_action', built_in: true },
                    relations: { policies: ['system.default', 'system.missing'] },
                }],
            }));

            // Only system.default attached, system.missing skipped
            const remaining = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permission.id);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].policy_id).toBe(defaultPolicy.id);
        });
    });

    describe('multi-orphan + multi-permission', () => {
        it('should handle multiple orphan policies affecting different permissions', async () => {
            const orphanA = policyRepository.seed({
                name: 'system.orphan-a',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const orphanB = policyRepository.seed({
                name: 'system.orphan-b',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const defaultPolicy = policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permA = permissionRepository.seed({
                name: 'permission_a',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            const permB = permissionRepository.seed({
                name: 'permission_b',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permA.id,
                policy_id: orphanA.id,
                permission_realm_id: null,
                policy_realm_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permB.id,
                policy_id: orphanB.id,
                permission_realm_id: null,
                policy_realm_id: null,
            });

            const result = await build('system.default').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.default', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
                permissions: [
                    {
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: { name: 'permission_a', built_in: true },
                        relations: { policies: ['system.default'] },
                    },
                    {
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: { name: 'permission_b', built_in: true },
                        relations: { policies: ['system.default'] },
                    },
                ],
            }));

            expect(result.policies.sort()).toEqual(['system.orphan-a', 'system.orphan-b']);

            const permAReassigned = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permA.id);
            const permBReassigned = permissionPolicyRepository.getAll()
                .filter((j) => j.permission_id === permB.id);
            expect(permAReassigned).toHaveLength(1);
            expect(permAReassigned[0].policy_id).toBe(defaultPolicy.id);
            expect(permBReassigned).toHaveLength(1);
            expect(permBReassigned[0].policy_id).toBe(defaultPolicy.id);
        });

        it('should handle orphan policy with no junctions cleanly', async () => {
            policyRepository.seed({
                name: 'system.orphan-without-junction',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });

            const result = await build('system.default').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.something-else', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual(['system.orphan-without-junction']);
            expect(policyRepository.getAll()).toHaveLength(0);
        });
    });

    describe('idempotency and no-op', () => {
        it('should be a no-op when DB matches declared shape', async () => {
            policyRepository.seed({
                name: 'system.default',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            permissionRepository.seed({
                name: 'kept',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            roleRepository.seed({
                name: 'admin',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            scopeRepository.seed({
                name: 'openid',
                built_in: true,
                realm_id: null,
            });

            const result = await build('system.default').sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.default', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'kept', built_in: true },
                }],
                roles: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'admin', built_in: true },
                }],
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'openid', built_in: true },
                }],
            }));

            expect(result).toEqual({
                policies: [],
                permissions: [],
                roles: [],
                scopes: [],
            });
            expect(policyRepository.getAll()).toHaveLength(1);
            expect(permissionRepository.getAll()).toHaveLength(1);
            expect(roleRepository.getAll()).toHaveLength(1);
            expect(scopeRepository.getAll()).toHaveLength(1);
        });

        it('should be idempotent: a second sweep does nothing', async () => {
            policyRepository.seed({
                name: 'system.removed',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            policyRepository.seed({
                name: 'system.kept',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });

            const sweep = build();
            const data = declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.kept', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            });

            const first = await sweep.sweep(data);
            const second = await sweep.sweep(data);

            expect(first.policies).toEqual(['system.removed']);
            expect(second.policies).toEqual([]);
            expect(policyRepository.getAll().map((p) => p.name)).toEqual(['system.kept']);
        });
    });

    describe('not-built-in safety', () => {
        it('should not remove non-built-in permissions', async () => {
            permissionRepository.seed({
                name: 'custom_permission',
                built_in: false,
                realm_id: null,
                client_id: null,
            });

            const result = await build().sweep(declared({
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_else', built_in: true },
                }],
            }));

            expect(result.permissions).toEqual([]);
            expect(permissionRepository.getAll()).toHaveLength(1);
        });

        it('should not remove non-built-in roles', async () => {
            roleRepository.seed({
                name: 'custom_role',
                built_in: false,
                realm_id: null,
                client_id: null,
            });

            const result = await build().sweep(declared({
                roles: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_else', built_in: true },
                }],
            }));

            expect(result.roles).toEqual([]);
            expect(roleRepository.getAll()).toHaveLength(1);
        });

        it('should not remove non-built-in scopes', async () => {
            scopeRepository.seed({
                name: 'custom_scope',
                built_in: false,
                realm_id: null,
            });

            const result = await build().sweep(declared({
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_else', built_in: true },
                }],
            }));

            expect(result.scopes).toEqual([]);
            expect(scopeRepository.getAll()).toHaveLength(1);
        });
    });

    describe('realm-scoped safety (cross-type)', () => {
        it('should not remove realm-scoped built-in permissions', async () => {
            permissionRepository.seed({
                name: 'realm_perm',
                built_in: true,
                realm_id: 'realm-A',
                client_id: null,
            });

            const result = await build().sweep(declared({
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_else', built_in: true },
                }],
            }));

            expect(result.permissions).toEqual([]);
            expect(permissionRepository.getAll()).toHaveLength(1);
        });

        it('should not remove realm-scoped built-in roles', async () => {
            roleRepository.seed({
                name: 'realm_role',
                built_in: true,
                realm_id: 'realm-A',
                client_id: null,
            });

            const result = await build().sweep(declared({
                roles: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_else', built_in: true },
                }],
            }));

            expect(result.roles).toEqual([]);
            expect(roleRepository.getAll()).toHaveLength(1);
        });

        it('should not remove client-scoped built-in permissions', async () => {
            permissionRepository.seed({
                name: 'client_perm',
                built_in: true,
                realm_id: null,
                client_id: 'client-X',
            });

            const result = await build().sweep(declared({
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'something_else', built_in: true },
                }],
            }));

            expect(result.permissions).toEqual([]);
            expect(permissionRepository.getAll()).toHaveLength(1);
        });
    });

    describe('Layer 2 reference safety', () => {
        it('should refuse to delete an orphan policy that is referenced by role-permission.policy_id', async () => {
            const orphan = policyRepository.seed({
                name: 'system.realm-bound',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            rolePermissionRepository.seed({
                role_id: 'role-id',
                permission_id: 'permission-id',
                policy_id: orphan.id,
            } as Partial<RolePermission>);

            await expect(
                build('system.default').sweep(declared({
                    policies: [{
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: {
                            name: 'system.default', 
                            built_in: true, 
                            realm_id: null, 
                        },
                    }],
                })),
            ).rejects.toThrow(/Layer 2 reference\(s\) found/);

            // Orphan should still exist (not removed)
            expect(policyRepository.getAll()).toHaveLength(1);
        });

        it('should report which junction tables hold Layer 2 references', async () => {
            const orphan = policyRepository.seed({
                name: 'system.somepolicy',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            rolePermissionRepository.seed({
                role_id: 'r1', 
                permission_id: 'p1', 
                policy_id: orphan.id,
            } as Partial<RolePermission>);
            userPermissionRepository.seed({
                user_id: 'u1', 
                permission_id: 'p2', 
                policy_id: orphan.id,
            } as Partial<UserPermission>);
            clientPermissionRepository.seed({
                client_id: 'c1', 
                permission_id: 'p3', 
                policy_id: orphan.id,
            } as Partial<ClientPermission>);
            robotPermissionRepository.seed({
                robot_id: 'rb1', 
                permission_id: 'p4', 
                policy_id: orphan.id,
            } as Partial<RobotPermission>);

            await expect(
                build('system.default').sweep(declared({
                    policies: [{
                        strategy: { type: ProvisioningEntityStrategyType.MERGE },
                        attributes: {
                            name: 'system.kept', 
                            built_in: true, 
                            realm_id: null, 
                        },
                    }],
                })),
            ).rejects.toThrow(/role-permission=1.*user-permission=1.*client-permission=1.*robot-permission=1/);
        });

        it('should proceed when only Layer 1 (auth_permission_policies) references exist', async () => {
            const orphan = policyRepository.seed({
                name: 'system.user-self-manage-fields',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            const permission = permissionRepository.seed({
                name: 'user_self_manage',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            permissionPolicyRepository.seed({
                permission_id: permission.id,
                policy_id: orphan.id,
                permission_realm_id: null,
                policy_realm_id: null,
            });

            const result = await build().sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.something-else', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual(['system.user-self-manage-fields']);
            expect(policyRepository.getAll()).toHaveLength(0);
        });

        it('should not check Layer 2 references when junction repos are not wired', async () => {
            const orphan = policyRepository.seed({
                name: 'system.removable',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });

            // Build sweep without junction repos
            const sweep = new OrphanSweepSynchronizer({
                policyRepository,
                permissionRepository,
                permissionPolicyRepository,
                roleRepository,
                scopeRepository,
            });

            const result = await sweep.sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'system.kept', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
            }));

            expect(result.policies).toEqual(['system.removable']);
            void orphan;
        });
    });

    describe('cross-type aggregation', () => {
        it('should sweep all four types in a single call and return per-type result', async () => {
            policyRepository.seed({
                name: 'orphan_policy',
                built_in: true,
                realm_id: null,
                parent_id: null,
            });
            permissionRepository.seed({
                name: 'orphan_perm',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            roleRepository.seed({
                name: 'orphan_role',
                built_in: true,
                realm_id: null,
                client_id: null,
            });
            scopeRepository.seed({
                name: 'orphan_scope',
                built_in: true,
                realm_id: null,
            });

            const result = await build().sweep(declared({
                policies: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: {
                        name: 'kept_policy', 
                        built_in: true, 
                        realm_id: null, 
                    },
                }],
                permissions: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'kept_perm', built_in: true },
                }],
                roles: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'kept_role', built_in: true },
                }],
                scopes: [{
                    strategy: { type: ProvisioningEntityStrategyType.MERGE },
                    attributes: { name: 'kept_scope', built_in: true },
                }],
            }));

            expect(result).toEqual({
                policies: ['orphan_policy'],
                permissions: ['orphan_perm'],
                roles: ['orphan_role'],
                scopes: ['orphan_scope'],
            });
        });
    });
});
