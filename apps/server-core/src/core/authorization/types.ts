/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthorizationCheckClients,
    AuthorizationCheckPermissions,
    AuthorizationCheckRealms,
    BasePermission,
    BasePolicy,
    IPermissionEvaluator,
    IdentityPolicyData,
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
     * The permission names to check. Omitted, every selected definition is
     * checked, so a caller never maintains a list in step with its own UI.
     */
    names?: string[],
    /**
     * Which realms own the definitions to check, symbolic or verbatim.
     * Omitted, `[null]`.
     */
    realms?: AuthorizationCheckRealms,
    /**
     * Which clients own the definitions to check, symbolic or verbatim.
     * Omitted, `[null]`.
     */
    clients?: AuthorizationCheckClients,
    /**
     * Which resource realms each definition is checked against, symbolic or
     * verbatim. Omitted, `ownOrNull`.
     */
    targetRealms?: AuthorizationCheckRealms,
    /**
     * The client the request's token was issued for, absent when the request
     * carries none (the console session cookie, Basic). It is what a symbolic
     * client selector resolves to, the way the request's grants are narrowed
     * (#3597).
     */
    clientId?: string,
    /**
     * The caller's identity. It resolves a symbolic realm selector, and when
     * policies may see it (the caller's scopes include `global`) it carries
     * its grants, which resolve a symbolic client selector of a request
     * without a token client and decide whether a denied pair's expiry
     * concerns the caller. The evaluation itself reads the identity through `decorate`,
     * under the scope condition that belongs there.
     */
    identity?: IdentityPolicyData,
    /**
     * Wrap the evaluator the build composes, so the caller's own request rules
     * apply to it. REQUIRED rather than defaulted: the one rule that matters
     * here withholds the identity from a credential whose scopes lack
     * `global`, and a default would make forgetting it fail open.
     */
    decorate: (evaluator: IPermissionEvaluator) => IPermissionEvaluator,
};

export type AuthorizationCheckResult = {
    permissions: AuthorizationCheckPermissions,
    /**
     * The earliest instant a clock-dependent policy in an evaluated tree could
     * change its verdict, after which `permissions` is stale. Absent when no
     * verdict depends on the clock.
     */
    expiresAt?: Date,
};

/**
 * The validated body of `POST /authorization/check`. Declared here rather than
 * taken from `@authup/core-http-kit`, which is the wire-facing shape: this is
 * what the validator produces and the builder consumes.
 */
export type AuthorizationCheckPayload = {
    names?: string[],
    realms?: AuthorizationCheckRealms,
    clients?: AuthorizationCheckClients,
    targetRealms?: AuthorizationCheckRealms,
};
