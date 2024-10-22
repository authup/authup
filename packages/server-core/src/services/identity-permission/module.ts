/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Role } from '@authup/core-kit';
import type { PolicyIdentity } from '@authup/kit';
import { isPermissionItemEqual } from '@authup/kit';
import type { DataSource } from 'typeorm';
import { RobotRepository, RoleRepository, UserRepository } from '../../database/domains';

export class IdentityPermissionService {
    protected dataSource: DataSource;

    protected userRepository : UserRepository;

    protected roleRepository : RoleRepository;

    protected robotRepository : RobotRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;

        this.userRepository = new UserRepository(dataSource);
        this.roleRepository = new RoleRepository(dataSource);
        this.robotRepository = new RobotRepository(dataSource);
    }

    async hasSuperset(parent: PolicyIdentity, child: PolicyIdentity) : Promise<boolean> {
        const parentPermissions = await this.getFor(parent);
        const childPermissions = await this.getFor(child);

        for (let i = 0; i < childPermissions.length; i++) {
            const index = parentPermissions.findIndex(
                (permission) => isPermissionItemEqual(permission, childPermissions[i]),
            );
            if (index === -1) {
                return false;
            }
        }

        return true;
    }

    async getFor(identity: PolicyIdentity) : Promise<Permission[]> {
        // todo: add client
        switch (identity.type) {
            case 'user': {
                return this.getForUser(identity.id);
            }
            case 'robot': {
                return this.getForRobot(identity.id);
            }
            case 'role': {
                return this.getForRole(identity.id);
            }
        }

        return [];
    }

    async getForUser(id: string) : Promise<Permission[]> {
        const permissions = await this.userRepository.getBoundPermissions(id);
        const roles = await this.userRepository.getBoundRoles(id);
        const rolePermissions = await this.getForRoles(roles);
        if (rolePermissions.length === 0) {
            return permissions;
        }

        return [
            ...permissions,
            ...rolePermissions,
        ];
    }

    async getForRobot(id: string) : Promise<Permission[]> {
        const permissions = await this.robotRepository.getBoundPermissions(id);
        const roles = await this.robotRepository.getBoundRoles(id);
        const rolePermissions = await this.getForRoles(roles);
        if (rolePermissions.length === 0) {
            return permissions;
        }

        return [
            ...permissions,
            ...rolePermissions,
        ];
    }

    async getForRole(entity: Role | string) : Promise<Permission[]> {
        return this.getForRoles([entity]);
    }

    async getForRoles(entities: (Role | string)[]) : Promise<Permission[]> {
        if (entities.length === 0) {
            return [];
        }

        return this.roleRepository.getBoundPermissionsForMany(entities);
    }
}
