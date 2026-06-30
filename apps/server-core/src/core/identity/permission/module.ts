/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityPolicyData,
    PermissionGrant,
    PermissionPolicyBinding,
} from '@authup/access';
import {
    RealmScope,
    aggregatePermissionPolicyBindings,
    compareRealmScope,
    grantDominates,
    isPermissionPolicyBindingEqual,
} from '@authup/access';
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
    ResolveJunctionGrantResult,
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
        const parentAggregated = aggregatePermissionPolicyBindings(await this.getFor(parent));
        const childAggregated = aggregatePermissionPolicyBindings(await this.getFor(child));

        for (const childItem of childAggregated) {
            const parentItem = parentAggregated.find(
                (p) => isPermissionPolicyBindingEqual(p, childItem),
            );

            if (!parentItem) {
                return false;
            }

            // Disjunction-aware superset: EVERY child grant must be dominated by SOME parent
            // grant (reach >= AND the parent's policy provably covers the child's — see
            // grantDominates). A child grant the parent cannot match — an unconditional `any`
            // the parent only holds policy-gated, or a policy the parent does not itself hold
            // (#3159) — fails the check; the actor cannot assign more than it holds.
            for (const childGrant of childItem.grants) {
                const dominated = parentItem.grants.some(
                    (parentGrant) => grantDominates(parentGrant, childGrant),
                );

                if (!dominated) {
                    return false;
                }
            }
        }

        return true;
    }

    async resolveJunctionGrant(
        identity: IdentityPolicyData,
        options: ResolveJunctionPolicyOptions,
    ): Promise<ResolveJunctionGrantResult> {
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
            return { realmScope: RealmScope.OWN };
        }

        // Consider EVERY matching grant (a caller omitting realmId/clientId may leave more
        // than one permission-key group) so the ceiling never depends on repository order.
        const grants = aggregatePermissionPolicyBindings(matching)
            .flatMap((item) => item.grants);
        if (grants.length === 0) {
            return { realmScope: RealmScope.OWN };
        }

        // The propagation ceiling is the actor's MOST-permissive single grant (highest reach,
        // policy-free preferred on a tie). The capped junction `(min(requested, ceiling.scope),
        // ceiling.policy)` is then dominated by a real held grant, so the creator never confers
        // reach/policy it does not itself hold.
        const ceiling = selectCeilingGrant(grants);

        let policy: Policy | undefined;
        if (ceiling.policy) {
            // The ceiling is policy-restricted but its policy is not a propagatable Policy
            // (e.g. a composite with no id). Fail CLOSED: a `none` reach blocks propagation
            // rather than silently dropping the restriction and widening to an unrestricted
            // grant.
            if (!isPolicy(ceiling.policy)) {
                return { realmScope: RealmScope.NONE };
            }

            policy = ceiling.policy;
        }

        return { policy, realmScope: ceiling.realm_scope };
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

/**
 * The actor's most-permissive single grant — highest realm reach, policy-free preferred on a
 * tie — used as the junction propagation ceiling.
 */
function selectCeilingGrant(grants: PermissionGrant[]): PermissionGrant {
    return grants.reduce((best, grant) => {
        const comparison = compareRealmScope(grant.realm_scope, best.realm_scope);
        if (comparison > 0) {
            return grant;
        }

        if (comparison === 0 && !grant.policy && best.policy) {
            return grant;
        }

        return best;
    });
}
