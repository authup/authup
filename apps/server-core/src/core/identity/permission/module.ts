/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import type { IdentityPolicyData, PermissionItem } from '@authup/access';
import { isPermissionItemEqual, mergePermissionItems } from '@authup/access';
import type {
    IIdentityBindingRepository,
    IIdentityPermissionProvider,
    IRoleBindingRepository,
    IdentityPermissionProviderContext,
} from './types.ts';

export class IdentityPermissionProvider implements IIdentityPermissionProvider {
    protected clientRepository: IIdentityBindingRepository;

    protected userRepository: IIdentityBindingRepository;

    protected roleRepository: IRoleBindingRepository;

    protected robotRepository: IIdentityBindingRepository;

    constructor(ctx: IdentityPermissionProviderContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
        this.roleRepository = ctx.roleRepository;
        this.robotRepository = ctx.robotRepository;
    }

    async isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData) : Promise<boolean> {
        const parentPermissions = await this.getFor(parent);
        const childPermissions = await this.getFor(child);

        const parentItems = mergePermissionItems(
            parentPermissions.map((p) => this.toPermissionItem(p)),
        );
        const childItems = mergePermissionItems(
            childPermissions.map((p) => this.toPermissionItem(p)),
        );

        for (const childItem of childItems) {
            const parentItem = parentItems.find(
                (p) => isPermissionItemEqual(p, childItem),
            );

            if (!parentItem) {
                return false;
            }

            if (parentItem.policy && !childItem.policy) {
                return false;
            }
        }

        return true;
    }

    async getFor(identity: IdentityPolicyData) : Promise<Permission[]> {
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

    async getForClient(identity: IdentityPolicyData) : Promise<Permission[]> {
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

    async getForUser(identity: IdentityPolicyData) : Promise<Permission[]> {
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

    async getForRobot(identity: IdentityPolicyData) : Promise<Permission[]> {
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

    async getForRole(identity: IdentityPolicyData) : Promise<Permission[]> {
        return this.roleRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));
    }

    private reduceEntitiesByIdentityClient<T extends { client_id?: string | null }>(
        entities: T[],
        identity: IdentityPolicyData,
    ): T[] {
        if (!identity.clientId) {
            return entities;
        }

        return entities.filter((entity) => entity.client_id === identity.clientId);
    }

    private toPermissionItem(input: Permission) : PermissionItem {
        return {
            name: input.name,
            client_id: input.client_id,
            realm_id: input.realm_id,
            policy: (input as any).policy || undefined,
        };
    }
}
