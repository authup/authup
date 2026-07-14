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
    PermissionPolicy,
    Realm,
    Robot,
    RobotPermission,
    RobotRole,
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
    PermissionEntity,
    RealmEntity,
    RobotEntity,
    RobotPermissionEntity,
    RobotRoleEntity,
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
    RobotProvisioningSynchronizer,
    RoleProvisioningSynchronizer,
    ScopeProvisioningSynchronizer,
    UserProvisioningSynchronizer,
} from '../../../core/provisioning/synchronizer/index.ts';
import type { IProvisioningSource } from '../../../core/provisioning/types.ts';
import {
    ClientPermissionRepositoryAdapter,
    ClientRepositoryAdapter,
    ClientRoleRepositoryAdapter,
    KeyRepositoryAdapter,
    PermissionPolicyRepositoryAdapter,
    PermissionRepositoryAdapter,
    PolicyRepositoryAdapter,
    RealmRepositoryAdapter,
    RobotPermissionRepositoryAdapter,
    RobotRepositoryAdapter,
    RobotRoleRepositoryAdapter,
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
import { WebClientProvisioner } from '../../../core/entities/client/index.ts';
import { KeyProvisioner } from '../../../core/key/index.ts';
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
            sources.push(new FileProvisioningSource({ cwd: provisioningDir }));
        }

        const composite = new CompositeProvisioningSource(sources);
        const data = await composite.load(container);

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

            roleRepository,
            permissionRepository,

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

        const robotSynchronizer = new RobotProvisioningSynchronizer({
            robotRepository: new RobotRepositoryAdapter({
                repository: container.resolve<Repository<Robot>>(RobotEntity),
                realmRepository,
            }),
            robotRoleRepository: new RobotRoleRepositoryAdapter(
                container.resolve<Repository<RobotRole>>(RobotRoleEntity),
            ),
            robotPermissionRepository: new RobotPermissionRepositoryAdapter(
                container.resolve<Repository<RobotPermission>>(RobotPermissionEntity),
            ),

            roleRepository,
            permissionRepository,
        });

        const scopeRepository = new ScopeRepositoryAdapter({
            repository: container.resolve<Repository<Scope>>(ScopeEntity),
            realmRepository,
        });

        const scopeSynchronizer = new ScopeProvisioningSynchronizer({ repository: scopeRepository });

        const realmSynchronizer = new RealmProvisioningSynchronizer({
            repository: new RealmRepositoryAdapter(realmRepository),

            clientSynchronizer,
            roleSynchronizer,
            permissionSynchronizer,
            userSynchronizer,
            robotSynchronizer,
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
        // Per-realm public `web` client. Single provisioning mechanism:
        // list every realm (incl. pre-existing) and upsert its web client.
        // Idempotent; guarded on built_in inside the provisioner.
        // ---------------------------------------------------------------
        const webClientProvisioner = new WebClientProvisioner({
            clientRepository,
            appOrigins: getAppOrigins(config),
            logger: container.resolve(LoggerInjectionKey),
        });

        // Eager key minting (plan 071 hybrid model): every realm — incl.
        // pre-existing ones — holds sig + enc keys after startup, so the
        // management API shows them without waiting for first use. The
        // adapter is constructed locally (NOT resolved from the oauth2
        // module's registration) so provisioning stays runnable in minimal
        // module graphs (test setup, CLI); the KEK handling is identical.
        const keyProvisioner = new KeyProvisioner({
            keyStore: new KeyRepositoryAdapter(dataSource, {
                secretsCipher: config.secretsEncryptionKey ?
                    new SymmetricCipher(config.secretsEncryptionKey) :
                    null,
            }),
            logger: container.resolve(LoggerInjectionKey),
        });

        const realms = await realmRepository.find();
        for (const realm of realms) {
            await webClientProvisioner.ensureForRealm(realm);
            await keyProvisioner.ensureForRealm(realm);
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
            const hasAnyPolicy = await junctionRepo.findOneBy({ permission_id: permission.id });

            if (!hasAnyPolicy) {
                await junctionRepo.save(junctionRepo.create({
                    permission_id: permission.id,
                    permission_realm_id: permission.realm_id,
                    policy_id: defaultPolicy.id,
                    policy_realm_id: defaultPolicy.realm_id,
                }));
            }
        }
    }
}
