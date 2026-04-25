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
import type { Policy } from '@authup/core-kit';
import { isPolicy } from '@authup/core-kit';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IRobotRepository } from '../../entities/robot/types.ts';
import type { IRoleRepository } from '../../entities/role/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';
import type { IIdentityRoleProvider } from '../role/types.ts';
import type {
    IIdentityPermissionProvider,
    IdentityPermissionProviderContext,
    ResolveJunctionPolicyOptions,
} from './types.ts';

export class IdentityPermissionProvider implements IIdentityPermissionProvider {
    protected clientRepository: IClientRepository;

    protected userRepository: IUserRepository;

    protected roleRepository: IRoleRepository;

    protected robotRepository: IRobotRepository;

    protected roleProvider: IIdentityRoleProvider;

    constructor(ctx: IdentityPermissionProviderContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
        this.roleRepository = ctx.roleRepository;
        this.robotRepository = ctx.robotRepository;
        this.roleProvider = ctx.roleProvider;
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

    async getForClient(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        return this.combineWithRoleBindings(
            this.clientRepository.getBoundPermissions(identity.id),
            identity,
        );
    }

    async getForUser(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        return this.combineWithRoleBindings(
            this.userRepository.getBoundPermissions(identity.id)
                .then((data) => this.reduceBindingsByIdentityClient(data, identity)),
            identity,
        );
    }

    async getForRobot(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        return this.combineWithRoleBindings(
            this.robotRepository.getBoundPermissions(identity.id)
                .then((data) => this.reduceBindingsByIdentityClient(data, identity)),
            identity,
        );
    }

    async getForRole(identity: IdentityPolicyData) : Promise<PermissionPolicyBinding[]> {
        return this.roleRepository.getBoundPermissions(identity.id)
            .then((data) => this.reduceBindingsByIdentityClient(data, identity));
    }

    private async combineWithRoleBindings(
        bindingsPromise: Promise<PermissionPolicyBinding[]>,
        identity: IdentityPolicyData,
    ): Promise<PermissionPolicyBinding[]> {
        const [bindings, roles] = await Promise.all([
            bindingsPromise,
            this.roleProvider.getRolesFor(identity),
        ]);
        const roleBindings = await this.roleRepository.getBoundPermissionsForMany(roles);
        if (roleBindings.length === 0) {
            return bindings;
        }

        return [
            ...bindings,
            ...roleBindings,
        ];
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
}
