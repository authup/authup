/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import type { PolicyIdentity } from '@authup/access';
import { isPermissionItemEqual } from '@authup/access';
import type { DataSource } from 'typeorm';
import {
    ClientRepository,
    RobotRepository,
    RoleRepository,
    UserRepository,
} from '../../adapters/database/domains';

export class IdentityPermissionService {
    protected dataSource: DataSource;

    protected clientRepository: ClientRepository;

    protected userRepository : UserRepository;

    protected roleRepository : RoleRepository;

    protected robotRepository : RobotRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;

        this.clientRepository = new ClientRepository(dataSource);
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
        switch (identity.type) {
            case 'client': {
                return this.getForClient(identity);
            }
            case 'user': {
                return this.getForUser(identity);
            }
            case 'robot': {
                return this.getForRobot(identity);
            }
            case 'role': {
                return this.getForRole(identity);
            }
        }

        return [];
    }

    async getForClient(identity: PolicyIdentity) : Promise<Permission[]> {
        const permissions = await this.clientRepository.getBoundPermissions(identity.id);
        const roles = await this.clientRepository.getBoundRoles(identity.id);
        const rolePermissions = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (rolePermissions.length === 0) {
            return permissions;
        }

        return [
            ...permissions,
            ...rolePermissions,
        ];
    }

    async getForUser(identity: PolicyIdentity) : Promise<Permission[]> {
        const permissions = await this.userRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));

        const roles = await this.userRepository.getBoundRoles(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));

        const rolePermissions = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (rolePermissions.length === 0) {
            return permissions;
        }

        return [
            ...permissions,
            ...rolePermissions,
        ];
    }

    async getForRobot(identity: PolicyIdentity) : Promise<Permission[]> {
        const permissions = await this.robotRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));

        const roles = await this.robotRepository.getBoundRoles(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));

        const rolePermissions = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (rolePermissions.length === 0) {
            return permissions;
        }

        return [
            ...permissions,
            ...rolePermissions,
        ];
    }

    async getForRole(identity: PolicyIdentity) : Promise<Permission[]> {
        return this.roleRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));
    }

    private reduceEntitiesByIdentityClient<T extends { client_id?: string | null }>(
        entities: T[],
        identity: PolicyIdentity,
    ): T[] {
        if (!identity.clientId) {
            return entities;
        }

        return entities.filter((entity) => entity.client_id === identity.clientId);
    }
}
