/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, SystemPolicyName } from '@authup/access';
import type { CompositePolicy } from '@authup/access';
import { DecisionStrategy } from '@authup/kit';
import type {

    Client,
    ClientScope,
    Permission,
    PermissionPolicy,
    Realm,
    Role,
} from '@authup/core-kit';
import {
    CLIENT_ACCOUNT_CONSOLE_NAME,
    CLIENT_ADMIN_CONSOLE_NAME,
    CLIENT_WEB_NAME,
    ClientAuthMethod,
    ClientTokenBindingMethod,
    REALM_MASTER_NAME,
} from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import {
    afterAll,
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import {
    CacheModule, 
    ClientEntity,
    ClientScopeEntity,
    ConfigModule,
    DefaultProvisioningSource,
    FileProvisioningSource,
    LoggerModule,
    PermissionEntity,
    PermissionPolicyEntity,
    ProvisionerModule,
    RealmEntity, 
    RoleEntity,
} from '../../../src/index.ts';
import { Container } from 'eldin';
import type { IContainer } from 'eldin';
import { PolicyProvisioningSynchronizer, SYSTEM_CLIENT_SCOPE_NAMES } from '../../../src/core/index.ts';
import type { PolicyProvisioningEntity } from '../../../src/core/provisioning/entities/policy/index.ts';
import { PolicyRepository } from '../../../src/adapters/database/domains/index.ts';
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

    // The raw ValidupError message is the generic "Property <path> is invalid"
    // and names neither the file nor the reason, so a bad entry in one of
    // several mounted files aborted the boot with nothing to act on.
    it('should name the file and the issues when a provisioning file is invalid', async () => {
        const source = new FileProvisioningSource({ cwd: 'test/data/sources-invalid' });

        await expect(source.load()).rejects.toThrow(/client-name\.yaml/);
        await expect(source.load()).rejects.toThrow(
            /realms\[0]\.relations\.clients\[0]\.attributes\.name/,
        );
    });

    it('should load provisioning data', async () => {
        const source = new FileProvisioningSource({ cwd: 'test/data/sources' });
        const output = await source.load();

        expect(output.policies).toHaveLength(1);
        expect(output.roles).toHaveLength(2);
        expect(output.permissions).toHaveLength(1);
        expect(output.scopes).toHaveLength(1);
        expect(output.realms).toHaveLength(1);

        // validated output preserves provisioning-only fields and relations
        expect(output.policies![0].attributes.builtIn).toBe(true);
        expect(output.roles![1].attributes.builtIn).toBe(true);
        expect(output.permissions![0].relations?.policies).toEqual(['file-policy']);

        const [realm] = output.realms!;

        expect(realm.relations).toBeDefined();
        expect(realm.relations?.roles).toHaveLength(2);
        expect(realm.relations?.permissions).toHaveLength(1);
        expect(realm.relations?.users).toHaveLength(1);
        expect(realm.relations?.clients).toHaveLength(1);
    });

    it('should load provisioning data from yaml and json files', async () => {
        // locter returns json/yaml parsed content directly (no `.default` wrapper),
        // unlike js/ts module files — the source must handle both, otherwise these
        // files validate to nothing and are silently skipped.
        const source = new FileProvisioningSource({ cwd: 'test/data/sources-data' });
        const output = await source.load();

        expect(output.permissions).toHaveLength(1);
        expect(output.permissions![0].attributes.name).toBe('yaml_permission');

        expect(output.roles).toHaveLength(1);
        expect(output.roles![0].attributes.name).toBe('yaml_role');
        expect(output.roles![0].relations?.globalPermissions).toEqual(['yaml_permission']);

        expect(output.scopes).toHaveLength(1);
        expect(output.scopes![0].attributes.name).toBe('json_scope');
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

        const builtInRole = await roleRepository.findOneBy({ name: 'bar', realmId: IsNull() });
        expect(builtInRole?.builtIn).toBe(true);

        const filePolicy = await policyRepositoryAdapter.findOneByName('file-policy');
        expect(filePolicy).toBeDefined();
        expect(filePolicy?.builtIn).toBe(true);

        const permissionRepository = di.resolve<Repository<Permission>>(PermissionEntity);
        const permission = await permissionRepository.findOneBy({ name: 'foo', realmId: IsNull() });
        expect(permission).toBeDefined();

        const permissionPolicyRepository = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);
        const junction = await permissionPolicyRepository.findOneBy({
            permissionId: permission!.id,
            policyId: filePolicy!.id,
        });
        expect(junction).toBeDefined();

        // The junction is the only source /authorize resolves client scopes
        // from, so a declared scope that never reaches it is not granted at
        // all (#3347). The fixture client declares one global and one realm
        // scope, and realm scopes must synchronize before the realm's clients
        // for the latter to resolve.
        const clientRepository = di.resolve<Repository<Client>>(ClientEntity);
        const clientScopeRepository = di.resolve<Repository<ClientScope>>(ClientScopeEntity);

        const client = await clientRepository.findOneBy({
            name: 'foo',
            realmId: realm!.id,
        });

        const clientScopes = await clientScopeRepository.find({
            where: { clientId: client!.id },
            relations: { scope: true },
        });

        expect(clientScopes.map((row) => row.scope.name).sort()).toEqual(['foo', 'realm-scope']);
    });

    // Every realm carries a public `web` client whose provisioned scopes must
    // reach the junction (#3347). `web` is also a reserved client name, so a
    // non-built-in row predates the reservation and must not shadow the
    // realm's login client.
    it('should provision the web client of every realm with its scopes', async () => {
        const realmRepository = di.resolve<Repository<Realm>>(RealmEntity);
        const clientRepository = di.resolve<Repository<Client>>(ClientEntity);
        const clientScopeRepository = di.resolve<Repository<ClientScope>>(ClientScopeEntity);

        // A legacy realm holding a confidential client on the reserved name.
        const legacyRealm = await realmRepository.save(realmRepository.create({ name: 'takeover' }));
        await clientRepository.save(clientRepository.create({
            name: CLIENT_WEB_NAME,
            realmId: legacyRealm.id,
            builtIn: false,
            authMethod: ClientAuthMethod.SECRET,
            tokenBindingMethod: ClientTokenBindingMethod.NONE,
            secret: 'legacy-secret',
            secretHashed: false,
            redirectUri: 'http://user-owned.example.com/**',
        }));

        const provisioning = new ProvisionerModule([
            new DefaultProvisioningSource(),
        ]);
        await provisioning.setup(di);

        const readScopeNames = async (clientId: string) => {
            const rows = await clientScopeRepository.find({
                where: { clientId },
                relations: { scope: true },
            });

            return rows.map((row) => row.scope.name).sort();
        };

        const masterRealm = await realmRepository.findOneBy({ name: REALM_MASTER_NAME });
        const masterWebClient = await clientRepository.findOneBy({
            name: CLIENT_WEB_NAME,
            realmId: masterRealm!.id,
        });

        expect(await readScopeNames(masterWebClient!.id)).toEqual(
            [...SYSTEM_CLIENT_SCOPE_NAMES].sort(),
        );

        // `secret` is a select:false column, so read it back explicitly.
        const legacyClient = await clientRepository
            .createQueryBuilder('client')
            .addSelect('client.secret')
            .where('client.name = :name', { name: CLIENT_WEB_NAME })
            .andWhere('client.realmId = :realmId', { realmId: legacyRealm.id })
            .getOne();

        expect(legacyClient!.builtIn).toBe(true);
        expect(legacyClient!.authMethod).toBe(ClientAuthMethod.NONE);
        expect(legacyClient!.redirectUri).not.toBe('http://user-owned.example.com/**');

        // The client is public now, so the secret can never authenticate it
        // again and must not stay at rest.
        expect(legacyClient!.secret).toBeNull();

        expect(await readScopeNames(legacyClient!.id)).toEqual(
            [...SYSTEM_CLIENT_SCOPE_NAMES].sort(),
        );

        // Plan 079: every realm additionally carries the admin-console and
        // account-console system clients, scopes bound and displayName
        // seeded at create.
        for (const name of [CLIENT_ADMIN_CONSOLE_NAME, CLIENT_ACCOUNT_CONSOLE_NAME]) {
            for (const realm of [masterRealm!, legacyRealm]) {
                const client = await clientRepository.findOneBy({
                    name,
                    realmId: realm.id,
                });

                expect(client, `${name} in ${realm.name}`).not.toBeNull();
                expect(client!.builtIn).toBe(true);
                expect(client!.authMethod).toBe(ClientAuthMethod.NONE);
                expect(client!.displayName).not.toBeNull();
                expect(await readScopeNames(client!.id)).toEqual(
                    [...SYSTEM_CLIENT_SCOPE_NAMES].sort(),
                );
            }
        }
    });

    // ---------------------------------------------------------------
    // Policy provisioning
    // ---------------------------------------------------------------

    describe('policy provisioning', () => {
        // ---------------------------------------------------------------
        // Backfill — must run before any policy sync so the permission
        // has createdAt < default policy createdAt
        // ---------------------------------------------------------------

        it('should assign default policy to permissions without it via junction table', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();

            const permissionRepo = di.resolve<Repository<Permission>>(PermissionEntity);
            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);

            const oldPermission = await permissionRepo.save(permissionRepo.create({
                name: 'old_permission_backfill',
                builtIn: false,
            }));

            // Verify no junction exists yet
            const before = await junctionRepo.findOneBy({
                permissionId: oldPermission.id,
                policyId: defaultPolicy!.id,
            });
            expect(before).toBeNull();

            // Run assignDefaultPolicy manually (avoid full provisioning to prevent SQLite nested transaction)
            const existing = await junctionRepo.findOneBy({
                permissionId: oldPermission.id,
                policyId: defaultPolicy!.id,
            });
            if (!existing) {
                await junctionRepo.save(junctionRepo.create({
                    permissionId: oldPermission.id,
                    permissionRealmId: oldPermission.realmId,
                    policyId: defaultPolicy!.id,
                    policyRealmId: defaultPolicy!.realmId,
                }));
            }

            const after = await junctionRepo.findOneBy({
                permissionId: oldPermission.id,
                policyId: defaultPolicy!.id,
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
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
            });

            // Attempt to re-assign — should be idempotent
            const existing = await junctionRepo.findOneBy({
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
            });
            if (!existing) {
                await junctionRepo.save(junctionRepo.create({
                    permissionId: permission!.id,
                    permissionRealmId: permission!.realmId,
                    policyId: defaultPolicy!.id,
                    policyRealmId: defaultPolicy!.realmId,
                }));
            }

            const countAfter = await junctionRepo.countBy({
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
            });
            expect(countAfter).toBe(countBefore);
        });

        // ---------------------------------------------------------------
        // Policy sync tests — policies already exist from backfill test
        // ---------------------------------------------------------------

        it('should create all leaf policies with correct type and builtIn', async () => {
            const identity = await policyRepositoryAdapter.findOneByName(SystemPolicyName.IDENTITY);
            expect(identity).toBeDefined();
            expect(identity!.type).toBe(BuiltInPolicyType.IDENTITY);
            expect(identity!.builtIn).toBe(true);
            expect(identity!.realmId).toBeNull();

            const permBinding = await policyRepositoryAdapter.findOneByName(SystemPolicyName.PERMISSION_BINDING);
            expect(permBinding).toBeDefined();
            expect(permBinding!.type).toBe(BuiltInPolicyType.PERMISSION_BINDING);
            expect(permBinding!.builtIn).toBe(true);

            // The realm-match baseline child + the standalone realm policies were removed
            // in favour of the realmScope enum on junctions.
            expect(await policyRepositoryAdapter.findOneByName(SystemPolicyName.REALM_MATCH)).toBeNull();
            expect(await policyRepositoryAdapter.findOneByName('system.realm-bound')).toBeNull();
            expect(await policyRepositoryAdapter.findOneByName('system.realm-or-global')).toBeNull();
        });

        it('should create system.default composite with correct children and decisionStrategy', async () => {
            const defaultPolicy = await policyRepositoryAdapter.findOneByName(SystemPolicyName.DEFAULT);
            expect(defaultPolicy).toBeDefined();
            expect(defaultPolicy!.type).toBe(BuiltInPolicyType.COMPOSITE);
            expect(defaultPolicy!.builtIn).toBe(true);
            expect(defaultPolicy!.realmId).toBeNull();
            const defaultPolicyEA: Partial<CompositePolicy> = defaultPolicy!;
            expect(defaultPolicyEA.decisionStrategy).toBe(DecisionStrategy.UNANIMOUS);

            const children = await policyRepositoryAdapter.findManyBy({ parentId: defaultPolicy!.id });
            expect(children).toHaveLength(2);

            const childNames = children.map((c) => c.name).sort();
            expect(childNames).toEqual([
                SystemPolicyName.IDENTITY,
                SystemPolicyName.PERMISSION_BINDING,
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
            ];
            systemNames.forEach((name) => {
                const matches = allPolicies.filter((p) => p.name === name);
                expect(matches).toHaveLength(1);
            });
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
                            builtIn: true,
                            realmId: null,
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
                            builtIn: true,
                            realmId: null,
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
                    builtIn: false,
                }),
            );

            const junctionRepo = di.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity);
            await junctionRepo.save(
                junctionRepo.create({
                    permissionId: testPermission.id,
                    policyId: referencedChild!.id,
                }),
            );

            await synchronizer.synchronize(new DefaultProvisioningSource().buildPolicies()[0]);

            const detached = await policyRepositoryAdapter.findOneByName('system.referenced-child');
            expect(detached).toBeDefined();
            expect(detached!.parentId).toBeNull();
            expect(detached!.builtIn).toBe(false);
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
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
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
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
            });
            expect(countBefore).toBe(1);

            // Attempt duplicate insert — idempotent check
            const existing = await junctionRepo.findOneBy({
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
            });
            if (!existing) {
                await junctionRepo.save(junctionRepo.create({
                    permissionId: permission!.id,
                    policyId: defaultPolicy!.id,
                }));
            }

            const countAfter = await junctionRepo.countBy({
                permissionId: permission!.id,
                policyId: defaultPolicy!.id,
            });

            expect(countAfter).toBe(countBefore);
        });
    });
});
