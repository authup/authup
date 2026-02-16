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
    Permission,
    Realm,
    Robot,
    RobotPermission,
    RobotRole,
    Role,
    RolePermission,
    Scope,
    User,
    UserPermission,
    UserRole,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
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
    UserEntity,
    UserPermissionEntity,
    UserRoleEntity,
} from '../../../adapters/database/index.ts';
import type { IDIContainer } from '../../../core/index.ts';
import type { Config } from '../config/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { Module } from '../types.ts';
import { CompositeProvisioningSource, DefaultProvisioningSource } from './sources/index.ts';
import {
    ClientProvisioningSynchronizer,
    GraphProvisioningSynchronizer,
    PermissionProvisioningSynchronizer,
    RealmProvisioningSynchronizer,
    RobotProvisioningSynchronizer,
    RoleProvisioningSynchronizer,
    ScopeProvisioningSynchronizer,
    UserProvisioningSynchronizer,
} from './synchronizer/index.ts';
import type {
    IProvisioningSource,
} from './types.ts';

export class ProvisionerModule implements Module {
    protected sources: IProvisioningSource[];

    constructor(sources: IProvisioningSource[] = []) {
        this.sources = sources;
    }

    async start(container: IDIContainer): Promise<void> {
        const config = container.resolve<Config>(ConfigInjectionKey);

        const sources : IProvisioningSource[] = [
            new DefaultProvisioningSource({
                config,
            }),
            ...this.sources,
        ];

        const composite = new CompositeProvisioningSource(sources);
        const data = await composite.load();

        const permissionSynchronizer = new PermissionProvisioningSynchronizer({
            repository: container.resolve<Repository<Permission>>(PermissionEntity),
        });

        const roleSynchronizer = new RoleProvisioningSynchronizer({
            repository: container.resolve<Repository<Role>>(RoleEntity),
            permissionRepository: container.resolve<Repository<Permission>>(PermissionEntity),
            rolePermissionRepository: container.resolve<Repository<RolePermission>>(RolePermissionEntity),
        });

        const clientSynchronizer = new ClientProvisioningSynchronizer({
            clientRepository: container.resolve<Repository<Client>>(ClientEntity),
            clientRoleRepository: container.resolve<Repository<ClientRole>>(ClientRoleEntity),
            clientPermissionRepository: container.resolve<Repository<ClientPermission>>(ClientPermissionEntity),

            roleRepository: container.resolve<Repository<Role>>(RoleEntity),
            permissionRepository: container.resolve<Repository<Permission>>(PermissionEntity),

            roleSynchronizer,
            permissionSynchronizer,
        });

        const userSynchronizer = new UserProvisioningSynchronizer({
            userRepository: container.resolve<Repository<User>>(UserEntity),
            userRoleRepository: container.resolve<Repository<UserRole>>(UserRoleEntity),
            userPermissionRepository: container.resolve<Repository<UserPermission>>(UserPermissionEntity),

            clientRepository: container.resolve<Repository<Client>>(ClientEntity),
            roleRepository: container.resolve<Repository<Role>>(RoleEntity),
            permissionRepository: container.resolve<Repository<Permission>>(PermissionEntity),
        });

        const robotSynchronizer = new RobotProvisioningSynchronizer({
            robotRepository: container.resolve<Repository<Robot>>(RobotEntity),
            robotRoleRepository: container.resolve<Repository<RobotRole>>(RobotRoleEntity),
            robotPermissionRepository: container.resolve<Repository<RobotPermission>>(RobotPermissionEntity),

            clientRepository: container.resolve<Repository<Client>>(ClientEntity),
            roleRepository: container.resolve<Repository<Role>>(RoleEntity),
            permissionRepository: container.resolve<Repository<Permission>>(PermissionEntity),
        });

        const scopeSynchronizer = new ScopeProvisioningSynchronizer({
            repository: container.resolve<Repository<Scope>>(ScopeEntity),
        });

        const realmSynchronizer = new RealmProvisioningSynchronizer({
            repository: container.resolve<Repository<Realm>>(RealmEntity),

            clientSynchronizer,
            roleSynchronizer,
            permissionSynchronizer,
            userSynchronizer,
            robotSynchronizer,
            scopeSynchronizer,
        });

        const rootSynchronizer = new GraphProvisioningSynchronizer({
            permissionSynchronizer,
            roleSynchronizer,
            realmSynchronizer,
            scopeSynchronizer,
        });

        await rootSynchronizer.synchronize(data);
    }
}
