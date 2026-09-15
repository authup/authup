/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { IdentityPolicyData } from '../../policy';
import type { RealmScope } from '../realm-scope';

/**
 * One policy tree node as it travels: the type's configuration keys (the output
 * of that type's validator), `invert`, and for a composite its children inline.
 */
export type AuthorizationPolicy = {
    type: string,
    invert?: boolean | null,
    children?: AuthorizationPolicy[],
    [key: string]: unknown,
};

export type AuthorizationDefinition = {
    name: string,
    realm_id: string | null,
    client_id: string | null,
    decision_strategy: `${DecisionStrategy}` | null,
    /**
     * The definition layer: the ids of the policy trees bound to the permission
     * definition (`auth_permission_policies`). Empty means unrestricted at this
     * layer. `null` means the server could not project one of those trees onto
     * the wire (a policy type the catalog does not carry, or a configuration
     * its validator refuses): the definition exists, a consumer cannot evaluate
     * it and denies it, dropping every grant of it, until the policy is fixed.
     */
    policies: string[] | null,
};

/**
 * Identity-free and cacheable: every permission definition with its policy trees.
 */
export type AuthorizationCatalog = {
    /**
     * Every policy tree a definition or a grant can name, keyed by the tree's
     * own id and present exactly once however many of them reference it.
     */
    policies: Record<string, AuthorizationPolicy>,
    permissions: AuthorizationDefinition[],
};

/**
 * One raw grant of an identity as the introspection endpoints report it: the
 * permission namespace it names, its realm reach and the junction policy ids.
 * Structurally the extended `OAuth2TokenPermission` of `@authup/specs` (this
 * package does not depend on specs).
 */
export type AuthorizationGrant = {
    name: string,
    realm_id?: string | null,
    client_id?: string | null,
    /**
     * Absent or null coerces to `own`, fail-closed.
     */
    realm_scope?: `${RealmScope}` | null,
    /**
     * Absent or null means no junction policy.
     */
    policies?: string[] | null,
};

export type AuthorizationEvaluatorInput = {
    /**
     * An `AuthorizationCatalog`, validated by the schema.
     */
    catalog: unknown,
    /**
     * `AuthorizationGrant[]`, validated by the schema. Defaults to none, and
     * may only be supplied together with the identity holding them.
     */
    grants?: unknown,
    /**
     * The identity the grants belong to. Omitted for an anonymous caller:
     * no identity data is injected and no grant is bound, so only a
     * definition whose policies need no identity can pass.
     */
    identity?: IdentityPolicyData,
};

/**
 * Which resource realms a batch check evaluates against.
 *
 * A string is SYMBOLIC and resolved server-side against the caller's own
 * identity: `own` is the realm the identity belongs to, `ownOrNull` is that
 * realm plus `null`, the global rows every realm shares. An array is taken
 * VERBATIM: the server resolves no realm key, so it discloses no realm's
 * existence and the caller matches the answer against its own input with no
 * resolution step of its own.
 *
 * String versus array is what discriminates the two forms, so `own` stays
 * unambiguous even though it is a legal realm name.
 */
export type AuthorizationCheckRealms = `${RealmScope.OWN}` |
`${RealmScope.OWN_OR_NULL}` |
Array<string | null>;

/**
 * One permission the identity may attempt, and the requested realms it may
 * attempt it in. Never empty: a permission reaching no requested realm is
 * absent from the answer entirely, so absent means denied.
 */
export type AuthorizationCheckPermission = {
    name: string,
    realms: Array<string | null>,
};

/**
 * The answer `POST /authorization/check` serves: the caller's own verdicts,
 * paired with the realms they hold in.
 *
 * It is an upper bound on what may be ATTEMPTED rather than an entitlement,
 * the same posture the catalog and `GET /schemas` take: it is a pre-gate, so a
 * grant whose junction policy needs a resource row passes here and is still
 * decided per row on the server, which stays the enforcement point.
 */
export type AuthorizationCheckPermissions = AuthorizationCheckPermission[];

export type AuthorizationCheckEvaluatorInput = {
    /**
     * An `AuthorizationCheckPermissions`, validated by the schema.
     */
    permissions: unknown,
    /**
     * The identity the verdicts belong to, used to resolve a `realmMatch` of
     * `own` shape: a resource realm equal to this identity's realm id or name
     * is the identity's own realm. Omitted for an anonymous caller, which
     * holds no verdict at all.
     */
    identity?: IdentityPolicyData,
};
