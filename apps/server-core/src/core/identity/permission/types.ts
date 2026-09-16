/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type {
    IdentityPolicyData,
    IdentityTokenOptions,
    PermissionPolicyBinding,
    RealmScope,
} from '@authup/access';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IRoleRepository } from '../../entities/role/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';
import type { IIdentityRoleProvider } from '../role/types.ts';

/**
 * `tokenClientId` is the ACTOR's token client, so the grant is
 * selected from the grants the actor's own gates evaluated (#3597). `clientId`
 * selects the permission definition.
 */
export type ResolveJunctionPolicyOptions = IdentityTokenOptions & {
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

export interface IIdentityPermissionProvider {
    getFor(identity: IdentityPolicyData, options: IdentityTokenOptions): Promise<PermissionPolicyBinding[]>;
    /**
     * `options` describe the PARENT's token; the child is resolved under none.
     */
    isSuperset(parent: IdentityPolicyData, child: IdentityPolicyData, options: IdentityTokenOptions): Promise<boolean>;
    resolveJunctionGrant(identity: IdentityPolicyData, options: ResolveJunctionPolicyOptions): Promise<ResolveJunctionGrantResult>;
}

export type IdentityPermissionProviderContext = {
    clientRepository: IClientRepository;
    userRepository: IUserRepository;
    roleRepository: IRoleRepository;
    roleProvider: IIdentityRoleProvider;
};
