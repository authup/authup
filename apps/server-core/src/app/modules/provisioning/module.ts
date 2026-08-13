/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type {
    Client,
    ClientPermission,
    ClientRole,
    ClientScope,
    PermissionPolicy,
    Realm,
    Role,
    RolePermission,
    Scope,
    UserPermission,
    UserRole,
} from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import {
    ClientEntity,
    ClientPermissionEntity,
    ClientRoleEntity,
    ClientScopeEntity,
    PermissionEntity,
    RealmEntity,
    RoleEntity,
    RolePermissionEntity,
    ScopeEntity,
    UserPermissionEntity,
    UserRoleEntity,
} from '../../../adapters/database/index.ts';
import { SystemPolicyName } from '@authup/access';
import {
    PermissionPolicyEntity,
    PolicyRepository,
    UserRepository,
} from '../../../adapters/database/domains/index.ts';
import type { IContainer } from 'eldin';
import {
    ClientProvisioningSynchronizer,
    GraphProvisioningSynchronizer,
    PermissionProvisioningSynchronizer,
    PolicyProvisioningSynchronizer,
    RealmProvisioningSynchronizer,
    RoleProvisioningSynchronizer,
    ScopeProvisioningSynchronizer,
    UserProvisioningSynchronizer,
} from '../../../core/provisioning/synchronizer/index.ts';
import type { RealmProvisioningRelations } from '../../../core/provisioning/entities/index.ts';
import {
    WildcardRealmProvisioner,
    expandWildcardRealmEntry,
    extractWildcardRealmEntry,
} from '../../../core/provisioning/wildcard/index.ts';
import type { IProvisioningSource } from '../../../core/provisioning/types.ts';
import { ProvisioningInjectionKey } from './constants.ts';
import {
    ClientPermissionRepositoryAdapter,
    ClientRepositoryAdapter,
    ClientRoleRepositoryAdapter,
    ClientScopeRepositoryAdapter,
    KeyRepositoryAdapter,
    PermissionPolicyRepositoryAdapter,
    PermissionRepositoryAdapter,
    PolicyRepositoryAdapter,
    RealmRepositoryAdapter,
    RolePermissionRepositoryAdapter,
    RoleRepositoryAdapter,
    ScopeRepositoryAdapter,
    UserPermissionRepositoryAdapter,
    UserRepositoryAdapter, 
    UserRoleRepositoryAdapter, 
} from '../database/repositories/index.ts';
import { DatabaseInjectionKey } from '../database/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import fs from 'node:fs';
import path from 'node:path';
import { ConfigInjectionKey, getAppOrigins } from '../config/index.ts';
import { SymmetricCipher } from '@authup/server-kit';
import { LoggerInjectionKey } from '../logger/index.ts';
import { SystemClientProvisioner } from '../../../core/entities/client/index.ts';
import { KeyProvisioner } from '../../../core/key/index.ts';
import type { IKeyStore } from '../../../core/key/index.ts';
import { OAuth2InjectionToken } from '../oauth2/constants.ts';
import { CompositeProvisioningSource, FileProvisioningSource } from './sources/index.ts';

export class ProvisionerModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected sources: IProvisioningSource[];

    constructor(sources: IProvisioningSource[] = []) {
        this.name = ModuleName.PROVISIONING;
        this.dependencies = [ModuleName.CONFIG, ModuleName.DATABASE];
        this.sources = sources;
    }

    async setup(container: IContainer): Promise<void> {
        const sources = [...this.sources];

        const config = container.resolve(ConfigInjectionKey);
        const provisioningDir = path.join(config.writableDirectoryPath, 'provisioning');
        if (fs.existsSync(provisioningDir)) {
            sources.push(new FileProvisioningSource({
                cwd: provisioningDir,
                logger: container.resolve(LoggerInjectionKey),
            }));
        }

        const composite = new CompositeProvisioningSource(sources);
        const data = await composite.load(container);

        // ---------------------------------------------------------------
        // Wildcard realm entry (plan 082): split the `name: "*"` entry out
        // of `data.realms` and deep-merge it UNDER every explicit realm
        // entry (explicit wins per attribute, relation lists union) so the
        // graph sync below covers declared realms in one pass. Realms
        // without an explicit entry get the wildcard applied by the
        // backfill loop; runtime-created realms via the DI-registered
        // provisioner (RealmService hook).
        // ---------------------------------------------------------------
        const wildcardEntry = extractWildcardRealmEntry(data);
        let wildcardVariants : Map<string, RealmProvisioningRelations> | undefined;
        if (wildcardEntry) {
            wildcardVariants = expandWildcardRealmEntry(wildcardEntry, data);
        }

        const dataSource = container.resolve(DatabaseInjectionKey.DataSource);
        const realmRepository = container.resolve<Repository<Realm>>(RealmEntity);

        const permissionRepository = new PermissionRepositoryAdapter({
            repository: container.resolve<Repository<PermissionEntity>>(PermissionEntity),
            realmRepository,
        });

        const policyRepository = new PolicyRepositoryAdapter({
            repository: new PolicyRepository(dataSource),
            realmRepository,
        });

        // ---------------------------------------------------------------
        // Synchronize all entities (policies → permissions → roles → ...)
        // ---------------------------------------------------------------

        const permissionPolicyRepository = new PermissionPolicyRepositoryAdapter(
            container.resolve<Repository<PermissionPolicy>>(PermissionPolicyEntity),
        );

        const policySynchronizer = new PolicyProvisioningSynchronizer({
            repository: policyRepository,
            permissionPolicyRepository,
        });

        const roleRepository = new RoleRepositoryAdapter({
            repository: container.resolve<Repository<Role>>(RoleEntity),
            realmRepository,
        });
        const clientRepository = new ClientRepositoryAdapter({
            repository: container.resolve<Repository<Client>>(ClientEntity),
            realmRepository,
        });
        const scopeRepository = new ScopeRepositoryAdapter({
            repository: container.resolve<Repository<Scope>>(ScopeEntity),
            realmRepository,
        });
        const clientScopeRepository = new ClientScopeRepositoryAdapter(
            container.resolve<Repository<ClientScope>>(ClientScopeEntity),
        );

        const permissionSynchronizer = new PermissionProvisioningSynchronizer({
            repository: permissionRepository,
            policyRepository,
            permissionPolicyRepository,
        });

        const roleSynchronizer = new RoleProvisioningSynchronizer({
            repository: roleRepository,
            permissionRepository,
            rolePermissionRepository: new RolePermissionRepositoryAdapter(
                container.resolve<Repository<RolePermission>>(RolePermissionEntity),
            ),
        });

        const clientSynchronizer = new ClientProvisioningSynchronizer({
            clientRepository,
            clientRoleRepository: new ClientRoleRepositoryAdapter(
                container.resolve<Repository<ClientRole>>(ClientRoleEntity),
            ),
            clientPermissionRepository: new ClientPermissionRepositoryAdapter(
                container.resolve<Repository<ClientPermission>>(ClientPermissionEntity),
            ),
            clientScopeRepository,

            roleRepository,
            permissionRepository,
            scopeRepository,

            roleSynchronizer,
            permissionSynchronizer,
        });

        const userSynchronizer = new UserProvisioningSynchronizer({
            userRepository: new UserRepositoryAdapter({
                repository: new UserRepository(dataSource),
                realmRepository,
            }),
            userRoleRepository: new UserRoleRepositoryAdapter(
                container.resolve<Repository<UserRole>>(UserRoleEntity),
            ),
            userPermissionRepository: new UserPermissionRepositoryAdapter(
                container.resolve<Repository<UserPermission>>(UserPermissionEntity),
            ),

            clientRepository,
            roleRepository,
            permissionRepository,
        });

        const scopeSynchronizer = new ScopeProvisioningSynchronizer({ repository: scopeRepository });

        const realmSynchronizer = new RealmProvisioningSynchronizer({
            repository: new RealmRepositoryAdapter(realmRepository),

            clientSynchronizer,
            roleSynchronizer,
            permissionSynchronizer,
            userSynchronizer,
            scopeSynchronizer,
        });

        const rootSynchronizer = new GraphProvisioningSynchronizer({
            policySynchronizer,
            permissionSynchronizer,
            roleSynchronizer,
            realmSynchronizer,
            scopeSynchronizer,
        });

        await rootSynchronizer.synchronize(data);

        // ---------------------------------------------------------------
        // Per-realm system clients (web, admin-console, account-console).
        // Single provisioning mechanism: list every realm (incl.
        // pre-existing) and upsert its clients.
        // Idempotent; guarded on builtIn inside the provisioner.
        // ---------------------------------------------------------------
        const systemClientProvisioner = new SystemClientProvisioner({
            clientRepository,
            scopeRepository,
            clientScopeRepository,
            appOrigins: getAppOrigins(config),
            logger: container.resolve(LoggerInjectionKey),
        });

        // Eager key minting (plan 071 hybrid model): every realm — incl.
        // pre-existing ones — holds sig + enc keys after startup, so the
        // management API shows them without waiting for first use.
        //
        // The oauth2 module's registration is PREFERRED but optional, so
        // provisioning stays runnable in minimal module graphs (test setup,
        // CLI) where oauth2 never registered one; the locally constructed
        // fallback handles the KEK identically. Sharing the instance when
        // it exists matters because mint de-duplication is per adapter
        // (see KeyRepositoryAdapter.mintExclusive): a second adapter has
        // its own in-flight map, so this backfill and a concurrent
        // realm-create request would each mint their own key.
        const keyStore = container.has(OAuth2InjectionToken.KeyStore) ?
            container.resolve<IKeyStore>(OAuth2InjectionToken.KeyStore) :
            new KeyRepositoryAdapter(dataSource, {
                secretsCipher: config.secretsEncryptionKey ?
                    new SymmetricCipher(config.secretsEncryptionKey) :
                    null,
            });

        const keyProvisioner = new KeyProvisioner({
            keyStore,
            logger: container.resolve(LoggerInjectionKey),
        });

        // Wildcard realm provisioning (plan 082): one shared instance for
        // the boot backfill below AND the runtime realm-create hook (the
        // realm controller factory resolves the DI key lazily), so the two
        // paths cannot drift. Registered only when a wildcard entry was
        // declared.
        let wildcardProvisioner : WildcardRealmProvisioner | undefined;
        if (container.has(ProvisioningInjectionKey.WildcardRealmProvisioner)) {
            container.unregister(ProvisioningInjectionKey.WildcardRealmProvisioner);
        }
        if (wildcardEntry) {
            wildcardProvisioner = new WildcardRealmProvisioner({
                relations: wildcardEntry.relations ?? {},
                relationsByRealmName: wildcardVariants,
                synchronizer: realmSynchronizer,
                logger: container.resolve(LoggerInjectionKey),
            });
            container.register(ProvisioningInjectionKey.WildcardRealmProvisioner, { useValue: wildcardProvisioner });
        }

        const realms = await realmRepository.find();
        for (const realm of realms) {
            await systemClientProvisioner.ensureForRealm(realm);
            await keyProvisioner.ensureForRealm(realm);
            // Realms with an explicit entry were already covered by the
            // wildcard expansion inside the graph sync above.
            if (wildcardProvisioner && !wildcardProvisioner.hasExplicitEntry(realm)) {
                await wildcardProvisioner.ensureForRealm(realm);
            }
        }

        if (config.permissionsDefaultPolicyAssignment) {
            await this.assignDefaultPolicy(dataSource, policyRepository);
        }
    }

    protected async assignDefaultPolicy(
        dataSource: DataSource,
        policyRepository: PolicyRepositoryAdapter,
    ): Promise<void> {
        const defaultPolicy = await policyRepository.findOneByName(SystemPolicyName.DEFAULT);
        if (!defaultPolicy) {
            return;
        }

        const permissionRepo = dataSource.getRepository(PermissionEntity);
        const junctionRepo = dataSource.getRepository(PermissionPolicyEntity);

        const permissions = await permissionRepo.find();
        for (const permission of permissions) {
            const hasAnyPolicy = await junctionRepo.findOneBy({ permissionId: permission.id });

            if (!hasAnyPolicy) {
                await junctionRepo.save(junctionRepo.create({
                    permissionId: permission.id,
                    permissionRealmId: permission.realmId,
                    policyId: defaultPolicy.id,
                    policyRealmId: defaultPolicy.realmId,
                }));
            }
        }
    }
}
