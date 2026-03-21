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
import {
    PolicyRepository,
    UserRepository,
} from '../../../adapters/database/domains/index.ts';
import type { IDIContainer } from '../../../core/index.ts';
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
import type {
    IProvisioningSource,
} from '../../../core/provisioning/types.ts';
import {
    ClientPermissionRepositoryAdapter,
    ClientRepositoryAdapter,
    ClientRoleRepositoryAdapter,
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
import type { Module } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { CompositeProvisioningSource } from './sources/index.ts';

export class ProvisionerModule implements Module {
    readonly name: string;

    readonly dependsOn: string[];

    protected sources: IProvisioningSource[];

    constructor(sources: IProvisioningSource[] = []) {
        this.name = ModuleName.PROVISIONING;
        this.dependsOn = [ModuleName.DATABASE];
        this.sources = sources;
    }

    async start(container: IDIContainer): Promise<void> {
        const composite = new CompositeProvisioningSource(this.sources);
        const data = await composite.load(container);

        const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
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

        const policySynchronizer = new PolicyProvisioningSynchronizer({
            repository: policyRepository,
            permissionRepository,
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
        });

        const roleSynchronizer = new RoleProvisioningSynchronizer({
            repository: roleRepository,
            permissionRepository,
            policyRepository,
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

        const scopeSynchronizer = new ScopeProvisioningSynchronizer({
            repository: new ScopeRepositoryAdapter({
                repository: container.resolve<Repository<Scope>>(ScopeEntity),
                realmRepository,
            }),
        });

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

    }
}
