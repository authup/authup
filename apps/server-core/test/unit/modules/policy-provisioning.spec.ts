/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, DecisionStrategy, SystemPolicyName } from '@authup/access';
import type { Permission, Realm } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import {
    CacheModule,
    ConfigModule,
    LoggerModule,
    PermissionEntity,
    ProvisionerModule,
    RealmEntity,
    buildSystemPolicyProvisioningEntities,
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
import { TestDatabaseModule } from '../../app/index.ts';

describe('policy provisioning', () => {
    let di: IDIContainer;
    let dataSource: DataSource;
    let policyRepositoryAdapter: PolicyRepositoryAdapter;
    let permissionRepositoryAdapter: PermissionRepositoryAdapter;

    const config = new ConfigModule();
    const logger = new LoggerModule();
    const cache = new CacheModule();
    const database = new TestDatabaseModule();

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
    // Policy sync tests
    // ---------------------------------------------------------------

    describe('synchronize', () => {
        beforeEach(async () => {
            await dataSource.synchronize(true);
        });

        it('should create all leaf policies with correct type and built_in', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });

            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);

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
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });

            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);

            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();
            expect(defaultPolicy!.type).toBe(BuiltInPolicyType.COMPOSITE);
            expect(defaultPolicy!.built_in).toBe(true);
            expect(defaultPolicy!.realm_id).toBeNull();
            expect((defaultPolicy as any).decisionStrategy).toBe(DecisionStrategy.UNANIMOUS);

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

            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);
            await synchronizer.synchronize(input);

            const allPolicies = await policyRepositoryAdapter.findManyBy({});
            expect(allPolicies).toHaveLength(4);

            const defaultPolicies = allPolicies.filter(
                (p) => p.name === SystemPolicyName.DEFAULT,
            );
            expect(defaultPolicies).toHaveLength(1);
        });

        it('should set system.realm-match EA attributes correctly', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });

            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);

            const realmMatch = await policyRepositoryAdapter.findOneByName(SystemPolicyName.REALM_MATCH);
            expect(realmMatch).toBeDefined();
            expect((realmMatch as any).attributeName).toEqual(['realm_id']);
            expect((realmMatch as any).attributeNameStrict).toBe(false);
            expect((realmMatch as any).identityMasterMatchAll).toBe(true);
        });

        it('should delete stale child without permission references', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });

            const inputWithExtra: PolicyProvisioningEntity = {
                ...buildSystemPolicyProvisioningEntities(),
                children: [
                    ...buildSystemPolicyProvisioningEntities().children!,
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

            const normalInput = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(normalInput);

            staleChild = await policyRepositoryAdapter.findOneByName('system.stale-child');
            expect(staleChild).toBeNull();
        });

        it('should detach stale child with permission references', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });

            const inputWithExtra: PolicyProvisioningEntity = {
                ...buildSystemPolicyProvisioningEntities(),
                children: [
                    ...buildSystemPolicyProvisioningEntities().children!,
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

            const normalInput = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(normalInput);

            const detached = await policyRepositoryAdapter.findOneByName('system.referenced-child');
            expect(detached).toBeDefined();
            expect(detached!.parent_id).toBeNull();
            expect(detached!.built_in).toBe(false);
        });
    });

    // ---------------------------------------------------------------
    // Backfill tests
    // ---------------------------------------------------------------

    describe('backfill', () => {
        beforeEach(async () => {
            await dataSource.synchronize(true);
        });

        it('should assign system.default to permissions with policy_id IS NULL and created_at <= cutoff', async () => {
            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);

            const oldPermission = permissionRepo.create({
                name: 'old_permission',
                built_in: false,
            });
            await permissionRepo.save(oldPermission);

            const provisioning = new ProvisionerModule([]);
            await provisioning.start(di);

            const updated = await permissionRepo.findOneBy({ name: 'old_permission' });
            expect(updated).toBeDefined();
            expect(updated!.policy_id).toBeDefined();
            expect(updated!.policy_id).not.toBeNull();
        });

        it('should not touch permissions that already have a policy_id', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });
            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);

            const identity = await policyRepositoryAdapter.findOneByName(SystemPolicyName.IDENTITY);

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const perm = permissionRepo.create({
                name: 'existing_policy_perm',
                built_in: false,
                policy_id: identity!.id,
            });
            await permissionRepo.save(perm);

            const provisioning = new ProvisionerModule([]);
            await provisioning.start(di);

            const after = await permissionRepo.findOneBy({ name: 'existing_policy_perm' });
            expect(after).toBeDefined();
            expect(after!.policy_id).toBe(identity!.id);
        });
    });

    // ---------------------------------------------------------------
    // Config tests
    // ---------------------------------------------------------------

    describe('config: permissionsDefaultPolicyAssignment', () => {
        beforeEach(async () => {
            await dataSource.synchronize(true);
        });

        it('should assign system.default to new permissions when defaultPolicyId is set', async () => {
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });
            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);

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
            const synchronizer = new PolicyProvisioningSynchronizer({
                repository: policyRepositoryAdapter,
                permissionRepository: permissionRepositoryAdapter,
            });
            const input = buildSystemPolicyProvisioningEntities();
            await synchronizer.synchronize(input);

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
