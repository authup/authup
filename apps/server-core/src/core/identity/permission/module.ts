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
    minRealmScope,
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
                if ((b.permission.realmId ?? null) !== (options.realmId ?? null)) {
                    return false;
                }
            }

            if (typeof options.clientId !== 'undefined') {
                if ((b.permission.clientId ?? null) !== (options.clientId ?? null)) {
                    return false;
                }
            }

            return true;
        });

        if (matching.length === 0) {
            return { realmScope: RealmScope.OWN };
        }

        // Consider EVERY matching grant (a caller omitting realmId/clientId may leave more
        // than one permission-key group); combined with the total ordering in
        // selectGrantForRequest, the selection never depends on grant/repository order.
        const grants = aggregatePermissionPolicyBindings(matching)
            .flatMap((item) => item.grants);
        if (grants.length === 0) {
            return { realmScope: RealmScope.OWN };
        }

        // Select the actor's grant RELATIVE to the requested reach (#3160): the grant that
        // confers the least-restrictive junction once capped to `realmScope` (highest capped
        // reach, policy-free preferred on a tie) — NOT a global "ceiling". A mixed-grant actor
        // (e.g. own+no-policy and any+policy) thus propagates its policy-free own grant for an
        // own request instead of inheriting the wider grant's policy. The selected grant is
        // returned UNCAPPED so the consumer's own cap (`min(requested, realmScope)`) and its
        // "actor is unrestricted-any?" check (which honours an explicit policyId) still hold.
        const requested = options.realmScope ?? RealmScope.OWN;
        const selected = selectGrantForRequest(grants, requested);

        let policy: Policy | undefined;
        if (selected.policy) {
            // The selected grant is policy-restricted but its policy is not a propagatable
            // Policy (e.g. a composite with no id). Fail CLOSED: a `none` reach blocks
            // propagation rather than silently dropping the restriction and widening to an
            // unrestricted grant.
            if (!isPolicy(selected.policy)) {
                return { realmScope: RealmScope.NONE };
            }

            policy = selected.policy;
        }

        return { policy, realmScope: selected.realmScope };
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

        return bindings.filter((binding) => binding.permission.clientId === identity.clientId);
    }
}

/**
 * Select the held grant that confers the least-restrictive junction for `requested` reach.
 *
 * Each grant is ranked by the reach it can actually confer for THIS request — its own
 * `realmScope` capped to `requested` — so a lower-scoped policy-free grant beats a
 * higher-scoped policy-bound grant when both cap to the same requested reach (the mixed-grant
 * fix, #3160). On equal capped reach, a policy-free grant wins (least restrictive). The
 * ORIGINAL (uncapped) grant is returned: the consumer applies the `min` cap itself, and its
 * uncapped `realmScope`/`policy` drive the "actor is unrestricted-any?" check that decides
 * whether an explicitly-requested `policyId` may stand.
 *
 * The ordering is TOTAL and deterministic (independent of grant/repository order): ties between
 * two policy-bound grants on equal capped reach are broken by higher uncapped reach, then a
 * propagatable policy (one with an id) over an id-less composite that would fail closed, then
 * lexicographic policy id.
 */
function selectGrantForRequest(
    grants: PermissionGrant[],
    requested: `${RealmScope}`,
): PermissionGrant {
    return grants.reduce((best, grant) => (isGrantPreferred(grant, best, requested) ? grant : best));
}

/** True when `candidate` is a strictly better propagation source than `incumbent` for `requested`. */
function isGrantPreferred(
    candidate: PermissionGrant,
    incumbent: PermissionGrant,
    requested: `${RealmScope}`,
): boolean {
    const byCapped = compareRealmScope(
        minRealmScope([candidate.realmScope, requested]),
        minRealmScope([incumbent.realmScope, requested]),
    );
    if (byCapped !== 0) {
        return byCapped > 0;
    }

    // Least restrictive: a policy-free grant beats a policy-bound one on equal capped reach.
    if (!candidate.policy !== !incumbent.policy) {
        return !candidate.policy;
    }

    // Deterministic tie-break for two policy-bound grants on equal capped reach.
    const byUncapped = compareRealmScope(candidate.realmScope, incumbent.realmScope);
    if (byUncapped !== 0) {
        return byUncapped > 0;
    }

    // Prefer a propagatable policy (has an id) over an id-less composite that would fail closed.
    const candidateId = candidate.policy && isPolicy(candidate.policy) ? candidate.policy.id : undefined;
    const incumbentId = incumbent.policy && isPolicy(incumbent.policy) ? incumbent.policy.id : undefined;
    if (candidateId !== incumbentId) {
        if (typeof candidateId === 'undefined') {
            return false;
        }
        if (typeof incumbentId === 'undefined') {
            return true;
        }
        return candidateId < incumbentId;
    }

    return false;
}
