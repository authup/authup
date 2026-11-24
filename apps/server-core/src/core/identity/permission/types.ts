/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type {
    BasePermission,
    IdentityPolicyData,
    PermissionPolicyBinding,
    RealmScope,
} from '@authup/access';
import type { ActorContext } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IRoleRepository } from '../../entities/role/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';
import type { IIdentityRoleProvider } from '../role/types.ts';

export type ResolveJunctionPolicyOptions = {
    name: string;
    realmId?: string | null;
    clientId?: string | null;
    /**
     * The realm reach the junction is requested to confer (default `own`). The actor's
     * grant disjunction is selected RELATIVE to this request: the grant chosen is the one
     * that confers the least-restrictive junction once capped to `realmScope`, not the
     * actor's absolute most-permissive grant. Lets a mixed-grant actor propagate a
     * policy-free `own` grant for an `own` request even while holding a wider policy-bound
     * grant (#3160).
     */
    realmScope?: `${RealmScope}`;
};

/**
 * The actor's grant SELECTED for the requested reach (`ResolveJunctionPolicyOptions.realmScope`):
 * the policy to inherit (if any) and the grant's UNCAPPED `realmScope`. Returned uncapped on
 * purpose — the consumer applies the `min(requested, realmScope)` cap itself, and the uncapped
 * reach distinguishes a genuinely unrestricted actor (see `applyJunctionCreateGrant` /
 * `buildJunctionUpdateData`). This is not a global ceiling; it is request-relative (#3160).
 */
export type ResolveJunctionGrantResult = {
    policy?: Policy;
    realmScope: `${RealmScope}`;
};

/**
 * The widest reach of the actor's manager grants over a realm- or
 * client-owned permission (#3855, #3907).
 */
export type ResolveManagerGrantResult = {
    realmScope: `${RealmScope}`;
};

/**
 * The permission a manager grant is resolved for: its identity and the row
 * the `permission_update` gate evaluates.
 */
export type ManagedPermission = Pick<BasePermission, 'name' | 'realmId' | 'clientId'> & Record<string, any>;

/**
 * A permission-junction write: the actor, its own grants as its request
 * resolved them, and the permission it binds.
 */
export type PermissionJunctionContext = {
    provider: IIdentityPermissionProvider;
    actor: ActorContext;
    grants: PermissionPolicyBinding[];
    permission: ManagedPermission;
};

/**
 * A permission-junction update, whose stored permission may be gone.
 */
export type PermissionJunctionUpdateContext = Omit<PermissionJunctionContext, 'permission'> & {
    permission?: ManagedPermission | null;
};

/**
 * The part of a token its grants are resolved from: whose it is, and the
 * client it was issued to.
 */
export type IdentityToken = Pick<OAuth2TokenPayload, 'sub' | 'sub_kind' | 'client_id'>;

export type IdentityPermissionSubject = Pick<IdentityPolicyData, 'type' | 'id'>;

/**
 * The actor a superset check runs for, beside its grants: its evaluator runs
 * the `permission_update` gate on a realm- or client-owned permission,
 * narrowed to one manager grant at a time.
 */
export type SupersetActor = Pick<ActorContext, 'permissionEvaluator' | 'narrowGrants'>;

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPermissionSubject): Promise<PermissionPolicyBinding[]>;
    getForToken(token: IdentityToken): Promise<PermissionPolicyBinding[]>;
    /**
     * Whether `parent` covers every grant in `child`. A caller passes the
     * actor's own grants as its request resolved them, so an assignment is
     * checked against exactly what the actor's gates evaluated. A realm- or
     * client-owned permission is also covered when the actor manages it
     * (`resolveManagerGrant`) at least as wide as each of its grants (#3855).
     */
    isSuperset(
        parent: PermissionPolicyBinding[],
        child: PermissionPolicyBinding[],
        actor: SupersetActor,
    ): Promise<boolean>;
    /**
     * Whether the actor manages a realm- or client-owned permission, and so
     * may delegate it without holding it: `parent` holds a manager grant
     * (global `permission_update`, policy-free or bound to exactly one
     * non-inverted `clientMatch` policy) that, holding it alone, passes the
     * `permission_update` gate on the permission row with its realm and
     * owner. Answers the widest reach of such a grant, or `null` (also for
     * an actor that cannot narrow its grants).
     */
    resolveManagerGrant(
        parent: PermissionPolicyBinding[],
        permission: ManagedPermission,
        actor: SupersetActor,
    ): Promise<ResolveManagerGrantResult | null>;
    resolveJunctionGrant(bindings: PermissionPolicyBinding[], options: ResolveJunctionPolicyOptions): Promise<ResolveJunctionGrantResult>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IClientRepository;
    userRepository: IUserRepository;
    roleRepository: IRoleRepository;
    roleProvider: IIdentityRoleProvider;
};
