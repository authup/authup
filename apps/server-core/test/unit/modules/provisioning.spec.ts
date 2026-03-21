/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, DecisionStrategy, SystemPolicyName } from '@authup/access';
import type { Permission, Realm, Role } from '@authup/core-kit';
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
    ProvisionerModule,
    RealmEntity, RoleEntity,
} from '../../../src/index.ts';
import type { IDIContainer } from '../../../src/core/index.ts';
import {
    DependencyContainer,
    PermissionProvisioningSynchronizer,
    PolicyProvisioningSynchronizer,
} from '../../../src/core/index.ts';
import type { PolicyProvisioningEntity } from '../../../src/core/provisioning/entities/policy/index.ts';
import {
    PolicyRepository,
} from '../../../src/adapters/database/domains/index.ts';
import {
    PermissionRepositoryAdapter,
    PolicyRepositoryAdapter,
} from '../../../src/app/modules/database/repositories/index.ts';
import { DatabaseInjectionKey } from '../../../src/app/modules/database/index.ts';
import { createTestDatabaseModuleForSuite } from '../../app/index.ts';

describe('app/modules/provisioning', () => {
    let di: IDIContainer;
    let dataSource: DataSource;
    let policyRepositoryAdapter: PolicyRepositoryAdapter;
    let permissionRepositoryAdapter: PermissionRepositoryAdapter;

    const config = new ConfigModule();
    const logger = new LoggerModule();
    const cache = new CacheModule();
    const database = createTestDatabaseModuleForSuite();

    beforeAll(async () => {
        di = new DependencyContainer();

        await config.start(di);
        await logger.start(di);
        await cache.start(di);
        await database.start(di);

        dataSource = di.resolve<DataSource>(DatabaseInjectionKey.DataSource);
        const realmRepository = di.resolve<Repository<Realm>>(RealmEntity);

        policyRepositoryAdapter = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });

        permissionRepositoryAdapter = new PermissionRepositoryAdapter({
            repository: di.resolve<Repository<Permission>>(PermissionEntity),
            realmRepository,
        });
    });

    afterAll(async () => {
        await database.stop(di);
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
        await provisioning.start(di);

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

        it('should backfill permissions with policy_id IS NULL created before the default policy', async () => {
            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);

            const oldPermission = permissionRepo.create({
                name: 'old_permission',
                built_in: false,
            });
            await permissionRepo.save(oldPermission);

            // Set created_at to the past so it's before the default policy's created_at
            await dataSource
                .createQueryBuilder()
                .update(PermissionEntity)
                .set({ created_at: new Date('2020-01-01') })
                .where('name = :name', { name: 'old_permission' })
                .execute();

            const provisioning = new ProvisionerModule([new DefaultProvisioningSource()]);
            await provisioning.start(di);

            const updated = await permissionRepo.findOneBy({ name: 'old_permission' });
            expect(updated).toBeDefined();
            expect(updated!.policy_id).toBeDefined();
            expect(updated!.policy_id).not.toBeNull();
        });

        it('should not touch permissions that already have a policy_id', async () => {
            const identity = await policyRepositoryAdapter.findOneByName(SystemPolicyName.IDENTITY);
            expect(identity).toBeDefined();

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const perm = permissionRepo.create({
                name: 'existing_policy_perm',
                built_in: false,
                policy_id: identity!.id,
            });
            await permissionRepo.save(perm);

            const provisioning = new ProvisionerModule([new DefaultProvisioningSource()]);
            await provisioning.start(di);

            const after = await permissionRepo.findOneBy({ name: 'existing_policy_perm' });
            expect(after).toBeDefined();
            expect(after!.policy_id).toBe(identity!.id);
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
            expect((defaultPolicy as any).decision_strategy).toBe(DecisionStrategy.UNANIMOUS);

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
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
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
            expect((realmMatch as any).attribute_name).toEqual(['realm_id']);
            expect((realmMatch as any).attribute_name_strict).toBe(false);
            expect((realmMatch as any).identity_master_match_all).toBe(true);
        });

        it('should delete stale child without permission references', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
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
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
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
            await permissionRepo.save(
                permissionRepo.create({
                    name: 'test_permission_ref',
                    built_in: false,
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
        // Config: defaultPolicyId assignment
        // ---------------------------------------------------------------

        it('should assign system.default to new permissions when defaultPolicyId is set', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const permSynchronizer = new PermissionProvisioningSynchronizer({
                repository: permissionRepositoryAdapter,
                defaultPolicyId: defaultPolicy!.id,
            });

            await permSynchronizer.synchronize({
                attributes: { name: 'test_auto_assign', built_in: false },
            });

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const created = await permissionRepo.findOneBy({ name: 'test_auto_assign' });
            expect(created).toBeDefined();
            expect(created!.policy_id).toBe(defaultPolicy!.id);
        });

        it('should leave policy_id null when defaultPolicyId is not set', async () => {
            const permSynchronizer = new PermissionProvisioningSynchronizer({
                repository: permissionRepositoryAdapter,
            });

            await permSynchronizer.synchronize({
                attributes: { name: 'test_no_default', built_in: false },
            });

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const created = await permissionRepo.findOneBy({ name: 'test_no_default' });
            expect(created).toBeDefined();
            expect(created!.policy_id).toBeNull();
        });

        it('should not override explicit policy_id null when defaultPolicyId is set', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const permSynchronizer = new PermissionProvisioningSynchronizer({
                repository: permissionRepositoryAdapter,
                defaultPolicyId: defaultPolicy!.id,
            });

            await permSynchronizer.synchronize({
                attributes: { name: 'test_explicit_null', built_in: false, policy_id: null as any },
            });

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const created = await permissionRepo.findOneBy({ name: 'test_explicit_null' });
            expect(created).toBeDefined();
            expect(created!.policy_id).toBeNull();
        });
    });
});
