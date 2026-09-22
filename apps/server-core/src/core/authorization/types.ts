/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationCheckRealms,
    BasePermission,
    BasePolicy,
    IPermissionEvaluator,
    IdentityPolicyData,
    PermissionPolicyBinding,
    PolicyValidators,
} from '@authup/access';
import type { Logger } from '@authup/server-kit';

/**
 * One permission definition: the permission and the policy trees bound to it.
 */
export type PermissionPolicies = [BasePermission, BasePolicy[]];

/**
 * Everything the authorization catalog is built from. Both halves are read
 * whole, once per build: the catalog is identity-free, so there is nothing to
 * scope either of them by.
 */
export interface IAuthorizationCatalogRepository {
    /**
     * Every permission definition with the policy trees bound to it.
     */
    findDefinitions(): Promise<PermissionPolicies[]>;

    /**
     * Every policy tree a grant can name: the distinct policies the role, user
     * and client permission junction rows reference. They travel in the same
     * catalog, since a grant reaches the consumer through an introspection
     * that carries policy ids alone.
     */
    findGrantPolicies(): Promise<BasePolicy[]>;
}

export type AuthorizationCatalogBuilderContext = {
    catalogRepository: IAuthorizationCatalogRepository,
    logger?: Logger,
    /**
     * The policy types a tree may carry onto the wire, `PolicyDefaultValidators`
     * when omitted (#3635). It has to name exactly the types the evaluating
     * engines hold: a type projected here but unknown to the engine travels
     * as a tree the server itself denies.
     *
     * ponytail: server-core registers no custom policy type, so every factory
     * leaves this at the default; an embedder that registers an evaluator
     * passes its validator here and on the introspection context.
     */
    validators?: PolicyValidators,
};

/**
 * Whether the caller's own read grant reaches rows of this realm, `null` for a
 * global row. A required ARGUMENT of the build rather than a member of its
 * context: the context is per boot and the reach is per request, and an
 * optional one would fail open on a document carrying every realm's policy
 * configuration.
 */
export type AuthorizationRealmReach = (realmId: string | null) => Promise<boolean>;

/**
 * Everything the batch check is built from, per boot. The definitions come
 * from the same bulk read the catalog uses.
 */
export type AuthorizationCheckBuilderContext = {
    catalogRepository: IAuthorizationCatalogRepository,
    logger?: Logger,
};

export type AuthorizationCheckRequest = {
    /**
     * The permission namespaces to check. Omitted, every global definition is
     * checked, so a caller never maintains a list in step with its own UI.
     */
    names?: string[],
    /**
     * Which resource realms to check against, symbolic or verbatim. Omitted,
     * `ownOrNull`.
     */
    realms?: AuthorizationCheckRealms,
    /**
     * The caller's identity, used to resolve a symbolic realm selector. It is
     * NOT what the evaluation reads: the identity reaches the policy data
     * through `decorate`, under the scope condition that belongs there.
     */
    identity?: IdentityPolicyData,
    /**
     * Wrap the evaluator the build composes, so the caller's own request rules
     * apply to it. REQUIRED rather than defaulted: the one rule that matters
     * here withholds the identity from a credential whose scopes lack
     * `global`, and a default would make forgetting it fail open.
     */
    decorate: (evaluator: IPermissionEvaluator) => IPermissionEvaluator,
    /**
     * The grants an identity holds for this request, the source every gate of
     * the request reads (#3597), so a verdict cannot disagree with the gate
     * that would decide the same call. REQUIRED for the same reason as
     * `decorate`: a default would resolve grants the request's token does not
     * carry.
     */
    grants: (identity: IdentityPolicyData) => Promise<PermissionPolicyBinding[]>,
};

/**
 * The validated body of `POST /authorization/check`. Declared here rather than
 * taken from `@authup/core-http-kit`, which is the wire-facing shape: this is
 * what the validator produces and the builder consumes.
 */
export type AuthorizationCheckPayload = {
    names?: string[],
    realms?: AuthorizationCheckRealms,
};
