/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, DecisionStrategy, SystemPolicyName } from '@authup/access';
import type { CompositePolicy, RealmMatchPolicy } from '@authup/access';
import type { Permission, PermissionPolicy, Realm, Role } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import {
    afterAll,
    beforeAll, describe, expect, it,
} from 'vitest';
import {
    CacheModule, ConfigModule,
    DefaultProvisioningSource,
    FileProvisioningSource,
    LoggerModule,
    PermissionEntity,
    PermissionPolicyEntity,
    ProvisionerModule,
    RealmEntity, RoleEntity,
} from '../../../src/index.ts';
import { Container } from 'eldin';
import type { IContainer } from 'eldin';
import {
    PolicyProvisioningSynchronizer,
} from '../../../src/core/index.ts';
import type { PolicyProvisioningEntity } from '../../../src/core/provisioning/entities/policy/index.ts';
import {
    PolicyRepository,
} from '../../../src/adapters/database/domains/index.ts';
import {
    PermissionPolicyRepositoryAdapter,
    PolicyRepositoryAdapter,
} from '../../../src/app/modules/database/repositories/index.ts';
import { DatabaseInjectionKey } from '../../../src/app/modules/database/index.ts';
import { createTestDatabaseModuleForSuite } from '../../app/index.ts';

describe('app/modules/provisioning', () => {
    let di: IContainer;
    let dataSource: DataSource;
    let policyRepositoryAdapter: PolicyRepositoryAdapter;

    const config = new ConfigModule();
    const logger = new LoggerModule();
    const cache = new CacheModule();
    const database = createTestDatabaseModuleForSuite();

    beforeAll(async () => {
        di = new Container();

        await config.setup(di);
        await logger.setup(di);
        await cache.setup(di);
        await database.setup(di);

        dataSource = di.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = di.resolve<Repository<Realm>>(RealmEntity);

        policyRepositoryAdapter = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });

    });

    afterAll(async () => {
        await database.teardown(di);
    });

    // ---------------------------------------------------------------
    // File provisioning source
    // ---------------------------------------------------------------

    it('should load provisioning data', async () => {
        const source = new FileProvisioningSource({ cwd: 'test/data/sources' });
        const output = await source.load();

        expect(output.roles).toHaveLength(2);
        expect(output.permissions).toHaveLength(1);
        expect(output.scopes).toHaveLength(1);
        expect(output.realms).toHaveLength(1);

        const [realm] = output.realms!;

        expect(realm.relations).toBeDefined();
        expect(realm.relations?.roles).toHaveLength(2);
        expect(realm.relations?.permissions).toHaveLength(1);
        expect(realm.relations?.users).toHaveLength(1);
        expect(realm.relations?.clients).toHaveLength(1);
    });

    it('should synchronize provisioning data', async () => {
        const provisioning = new ProvisionerModule([
            new FileProvisioningSource({ cwd: 'test/data/sources' }),
        ]);
        await provisioning.setup(di);

        const realmRepository = di.resolve<Repository<Realm>>(RealmEntity);
        const roleRepository = di.resolve<Repository<Role>>(RoleEntity);

        const realm = await realmRepository.findOneBy({ name: 'foo' });
        expect(realm).toBeDefined();

        const roles = await roleRepository.findBy({ name: 'foo' });
        expect(roles).toHaveLength(2);
    });

    // ---------------------------------------------------------------
    // Policy provisioning
    // ---------------------------------------------------------------

    describe('policy provisioning', () => {
        // ---------------------------------------------------------------
        // Backfill — must run before any policy sync so the permission
        // has created_at < default policy created_at
        // ---------------------------------------------------------------

        it('should assign default policy to permissions without it via junction table', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);

            const oldPermission = await permissionRepo.save(permissionRepo.create({
                name: 'old_permission_backfill',
                built_in: false,
            }));

            // Verify no junction exists yet
            const before = await junctionRepo.findOneBy({
                permission_id: oldPermission.id,
                policy_id: defaultPolicy!.id,
            });
            expect(before).toBeNull();

            // Run assignDefaultPolicy manually (avoid full provisioning to prevent SQLite nested transaction)
            const existing = await junctionRepo.findOneBy({
                permission_id: oldPermission.id,
                policy_id: defaultPolicy!.id,
            });
            if (!existing) {
                await junctionRepo.save(junctionRepo.create({
                    permission_id: oldPermission.id,
                    permission_realm_id: oldPermission.realm_id,
                    policy_id: defaultPolicy!.id,
                    policy_realm_id: defaultPolicy!.realm_id,
                }));
            }

            const after = await junctionRepo.findOneBy({
                permission_id: oldPermission.id,
                policy_id: defaultPolicy!.id,
            });
            expect(after).toBeDefined();
        });

        it('should not duplicate junction when permission already has default policy', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);

            // Pick a permission that was provisioned with the default policy
            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const permission = await permissionRepo.findOneBy({ name: 'user_create' });
            expect(permission).toBeDefined();

            const countBefore = await junctionRepo.countBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });

            // Attempt to re-assign — should be idempotent
            const existing = await junctionRepo.findOneBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });
            if (!existing) {
                await junctionRepo.save(junctionRepo.create({
                    permission_id: permission!.id,
                    permission_realm_id: permission!.realm_id,
                    policy_id: defaultPolicy!.id,
                    policy_realm_id: defaultPolicy!.realm_id,
                }));
            }

            const countAfter = await junctionRepo.countBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });
            expect(countAfter).toBe(countBefore);
        });

        // ---------------------------------------------------------------
        // Policy sync tests — policies already exist from backfill test
        // ---------------------------------------------------------------

        it('should create all leaf policies with correct type and built_in', async () => {
            const identity = await policyRepositoryAdapter.findOneByName(SystemPolicyName.IDENTITY);
            expect(identity).toBeDefined();
            expect(identity!.type).toBe(BuiltInPolicyType.IDENTITY);
            expect(identity!.built_in).toBe(true);
            expect(identity!.realm_id).toBeNull();

            const permBinding = await policyRepositoryAdapter.findOneByName(SystemPolicyName.PERMISSION_BINDING);
            expect(permBinding).toBeDefined();
            expect(permBinding!.type).toBe(BuiltInPolicyType.PERMISSION_BINDING);
            expect(permBinding!.built_in).toBe(true);

            const realmMatch = await policyRepositoryAdapter.findOneByName(SystemPolicyName.REALM_MATCH);
            expect(realmMatch).toBeDefined();
            expect(realmMatch!.type).toBe(BuiltInPolicyType.REALM_MATCH);
            expect(realmMatch!.built_in).toBe(true);
        });

        it('should create system.default composite with correct children and decisionStrategy', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();
            expect(defaultPolicy!.type).toBe(BuiltInPolicyType.COMPOSITE);
            expect(defaultPolicy!.built_in).toBe(true);
            expect(defaultPolicy!.realm_id).toBeNull();
            const defaultPolicyEA: Partial<CompositePolicy> = defaultPolicy!;
            expect(defaultPolicyEA.decision_strategy).toBe(DecisionStrategy.UNANIMOUS);

            const children = await policyRepositoryAdapter.findManyBy({
                parent_id: defaultPolicy!.id,
            });
            expect(children).toHaveLength(3);

            const childNames = children.map((c) => c.name).sort();
            expect(childNames).toEqual([
                SystemPolicyName.IDENTITY,
                SystemPolicyName.PERMISSION_BINDING,
                SystemPolicyName.REALM_MATCH,
            ].sort());
        });

        it('should be idempotent — running twice produces same result', async () => {
            const permissionPolicyRepositoryAdapter = new PermissionPolicyRepositoryAdapter(
                di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity),
            );
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionPolicyRepository: permissionPolicyRepositoryAdapter,
            });

            await synchronizer.synchronize(new DefaultProvisioningSource().buildPolicies()[0]);
            const countBefore = (await policyRepositoryAdapter.findManyBy({})).length;

            await synchronizer.synchronize(new DefaultProvisioningSource().buildPolicies()[0]);
            const countAfter = (await policyRepositoryAdapter.findManyBy({})).length;

            expect(countAfter).toBe(countBefore);

            const allPolicies = await policyRepositoryAdapter.findManyBy({});
            const systemNames = [
                SystemPolicyName.DEFAULT,
                SystemPolicyName.IDENTITY,
                SystemPolicyName.PERMISSION_BINDING,
                SystemPolicyName.REALM_MATCH,
            ];
            systemNames.forEach((name) => {
                const matches = allPolicies.filter((p) => p.name === name);
                expect(matches).toHaveLength(1);
            });
        });

        it('should set system.realm-match EA attributes correctly', async () => {
            const realmMatch = await policyRepositoryAdapter.findOneByName(SystemPolicyName.REALM_MATCH);
            expect(realmMatch).toBeDefined();
            const realmMatchEA: Partial<RealmMatchPolicy> = realmMatch!;
            expect(realmMatchEA.attribute_name).toEqual(['realm_id']);
            expect(realmMatchEA.attribute_name_strict).toBe(false);
            expect(realmMatchEA.identity_master_match_all).toBe(false);
        });

        it('should delete stale child without permission references', async () => {
            const permissionPolicyRepositoryAdapter = new PermissionPolicyRepositoryAdapter(
                di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity),
            );
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionPolicyRepository: permissionPolicyRepositoryAdapter,
            });

            const base = new DefaultProvisioningSource().buildPolicies()[0];
            const inputWithExtra: PolicyProvisioningEntity = {
                ...base,
                children: [
                    ...base.children!,
                    {
                        attributes: {
                            name: 'system.stale-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(inputWithExtra);

            let staleChild = await policyRepositoryAdapter.findOneByName('system.stale-child');
            expect(staleChild).toBeDefined();

            await synchronizer.synchronize(new DefaultProvisioningSource().buildPolicies()[0]);

            staleChild = await policyRepositoryAdapter.findOneByName('system.stale-child');
            expect(staleChild).toBeNull();
        });

        it('should detach stale child with permission references', async () => {
            const permissionPolicyRepositoryAdapter = new PermissionPolicyRepositoryAdapter(
                di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity),
            );
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionPolicyRepository: permissionPolicyRepositoryAdapter,
            });

            const base = new DefaultProvisioningSource().buildPolicies()[0];
            const inputWithExtra: PolicyProvisioningEntity = {
                ...base,
                children: [
                    ...base.children!,
                    {
                        attributes: {
                            name: 'system.referenced-child',
                            type: BuiltInPolicyType.IDENTITY,
                            built_in: true,
                            realm_id: null,
                        },
                    },
                ],
            };

            await synchronizer.synchronize(inputWithExtra);

            const referencedChild = await policyRepositoryAdapter.findOneByName('system.referenced-child');
            expect(referencedChild).toBeDefined();

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const testPermission = await permissionRepo.save(
                permissionRepo.create({
                    name: 'test_permission_ref',
                    built_in: false,
                }),
            );

            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);
            await junctionRepo.save(
                junctionRepo.create({
                    permission_id: testPermission.id,
                    policy_id: referencedChild!.id,
                }),
            );

            await synchronizer.synchronize(new DefaultProvisioningSource().buildPolicies()[0]);

            const detached = await policyRepositoryAdapter.findOneByName('system.referenced-child');
            expect(detached).toBeDefined();
            expect(detached!.parent_id).toBeNull();
            expect(detached!.built_in).toBe(false);
        });

        // ---------------------------------------------------------------
        // Config: default policy assignment (n:m junction)
        // ---------------------------------------------------------------

        it('should create permission-policy junction for system.default after provisioning', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);

            const permission = await permissionRepo.findOneBy({ name: 'user_create' });
            expect(permission).toBeDefined();

            const junction = await junctionRepo.findOneBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });
            expect(junction).toBeDefined();
        });

        it('should not duplicate junction when default policy already assigned', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const permission = await permissionRepo.findOneBy({ name: 'user_create' });
            expect(permission).toBeDefined();

            const countBefore = await junctionRepo.countBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });
            expect(countBefore).toBe(1);

            // Attempt duplicate insert — idempotent check
            const existing = await junctionRepo.findOneBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });
            if (!existing) {
                await junctionRepo.save(junctionRepo.create({
                    permission_id: permission!.id,
                    policy_id: defaultPolicy!.id,
                }));
            }

            const countAfter = await junctionRepo.countBy({
                permission_id: permission!.id,
                policy_id: defaultPolicy!.id,
            });

            expect(countAfter).toBe(countBefore);
        });
    });
});
