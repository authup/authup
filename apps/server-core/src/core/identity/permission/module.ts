/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityPolicyData,
    PermissionPolicyBinding,
} from '@authup/access';
import { isPermissionPolicyBindingEqual, mergePermissionPolicyBindings } from '@authup/access';
import type { Policy, Role } from '@authup/core-kit';
import { isPolicy } from '@authup/core-kit';
import type {
    IIdentityBindingRepository,
    IIdentityPermissionProvider,
    IIdentityRoleProvider,
    IRoleBindingRepository,
    IdentityPermissionProviderContext,
    ResolveJunctionPolicyOptions,
} from './types.ts';

export class IdentityPermissionProvider implements IIdentityPermissionProvider, IIdentityRoleProvider {
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
        const parentBindings = await this.getFor(parent);
        const childBindings = await this.getFor(child);

        const parentMerged = mergePermissionPolicyBindings(parentBindings);
        const childMerged = mergePermissionPolicyBindings(childBindings);

        for (const childItem of childMerged) {
            const parentItem = parentMerged.find(
                (p) => isPermissionPolicyBindingEqual(p, childItem),
            );

            if (!parentItem) {
                return false;
            }

            if (
                parentItem.policies && parentItem.policies.length > 0 &&
                (!childItem.policies || childItem.policies.length === 0)
            ) {
                return false;
            }
        }

        return true;
    }

    async resolveJunctionPolicy(
        identity: IdentityPolicyData,
        options: ResolveJunctionPolicyOptions,
    ): Promise<Policy | undefined> {
        const bindings = await this.getFor(identity);
        const matching = bindings.filter((b) => {
            if (b.permission.name !== options.name) {
                return false;
            }

            if (typeof options.realmId !== 'undefined') {
                if ((b.permission.realm_id ?? null) !== (options.realmId ?? null)) {
                    return false;
                }
            }

            if (typeof options.clientId !== 'undefined') {
                if ((b.permission.client_id ?? null) !== (options.clientId ?? null)) {
                    return false;
                }
            }

            return true;
        });

        if (matching.length === 0) {
            return undefined;
        }

        const merged = mergePermissionPolicyBindings(matching);

        if (merged.length > 0 && merged[0].policies && merged[0].policies.length > 0) {
            const policy = merged[0].policies[0];
            if (isPolicy(policy)) {
                return policy;
            }
        }

        return undefined;
    }

    async getFor(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
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

    async getRolesFor(identity: IdentityPolicyData) : Promise<Role[]> {
        switch (identity.type) {
            case 'client': {
                return this.clientRepository.getBoundRoles(identity.id);
            }
            case 'user': {
                return this.userRepository.getBoundRoles(identity.id)
                    .then((data) => this.reduceEntitiesByIdentityClient(data, identity));
            }
            case 'robot': {
                return this.robotRepository.getBoundRoles(identity.id)
                    .then((data) => this.reduceEntitiesByIdentityClient(data, identity));
            }
        }

        return [];
    }

    async getForClient(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        const bindings = await this.clientRepository.getBoundPermissions(identity.id);
        const roles = await this.clientRepository.getBoundRoles(identity.id);
        const roleBindings = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (roleBindings.length === 0) {
            return bindings;
        }

        return [
            ...bindings,
            ...roleBindings,
        ];
    }

    async getForUser(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        const bindings = await this.userRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceBindingsByIdentityClient(data, identity));

        const roles = await this.userRepository.getBoundRoles(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));

        const roleBindings = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (roleBindings.length === 0) {
            return bindings;
        }

        return [
            ...bindings,
            ...roleBindings,
        ];
    }

    async getForRobot(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        const bindings = await this.robotRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceBindingsByIdentityClient(data, identity));

        const roles = await this.robotRepository.getBoundRoles(identity.id)
            .then((data) => this.reduceEntitiesByIdentityClient(data, identity));

        const roleBindings = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (roleBindings.length === 0) {
            return bindings;
        }

        return [
            ...bindings,
            ...roleBindings,
        ];
    }

    async getForRole(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        return this.roleRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceBindingsByIdentityClient(data, identity));
    }

    private reduceBindingsByIdentityClient(
        bindings: PermissionPolicyBinding[],
        identity: IdentityPolicyData,
    ): PermissionPolicyBinding[] {
        if (!identity.clientId) {
            return bindings;
        }

        return bindings.filter((binding) => binding.permission.client_id === identity.clientId);
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
}
