/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { IdentityPolicyData, PolicyEvaluators, PolicyValidators } from '../../policy';
import type { RealmScope } from '../realm-scope';
import type { AUTHORIZATION_CHECK_GRANTED } from './constants';

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
    realmId: string | null,
    clientId: string | null,
    decisionStrategy: `${DecisionStrategy}` | null,
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
 * package does not depend on specs), hence snake_case: it rides a protocol
 * response, where the catalog is authup's own and camelCase.
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

export type AuthorizationEvaluatorOptions = {
    /**
     * The policy types a catalog tree may carry. Defaults to
     * `PolicyDefaultValidators`; spread it to add a custom type.
     */
    validators?: PolicyValidators,
    /**
     * How the projected trees evaluate. Defaults to
     * `PolicyDefaultEvaluators`; spread it to add a custom type. The
     * permission-binding evaluator is always replaced by the one binding the
     * introspected grants.
     */
    evaluators?: PolicyEvaluators,
};

/**
 * Which resource realms each definition of a batch check is checked against
 * (`targetRealms`).
 *
 * A string is SYMBOLIC and resolved server-side against the caller's own
 * identity: `own` is the identity's own realm, `ownOrNull` adds `null`, the
 * global rows. An array is taken VERBATIM: the server resolves no key, so it
 * discloses no realm's existence and the caller matches the answer against
 * its own input with no resolution step of its own.
 *
 * String versus array is what discriminates the two forms, so `own` stays
 * unambiguous even though it is a legal realm name.
 */
export type AuthorizationCheckTargetRealms = `${RealmScope.OWN}` |
`${RealmScope.OWN_OR_NULL}` |
Array<string | null>;

/**
 * Which owners the definitions a batch check evaluates belong to: the owner
 * realms (`realms`) or the owner clients (`clients`). Both read the same way.
 *
 * - `own`: the caller's own realm, or the client the request's token was
 *   issued for. A request without a token client (the console session
 *   cookie, Basic) has no own client.
 * - `ownOrNull`: `own` plus `null`, the global (unowned) side.
 * - `granted` (`AUTHORIZATION_CHECK_GRANTED`): the owners of every definition
 *   the identity holds a grant of, plus `own` and `null`, so a superset of
 *   `ownOrNull`. It is how a caller reaches a definition owned by a realm or
 *   client other than its own, without knowing that owner in advance.
 * - an array: taken VERBATIM, like a target realm list.
 */
export type AuthorizationCheckSelector = AuthorizationCheckTargetRealms |
`${typeof AUTHORIZATION_CHECK_GRANTED}`;

/**
 * Which realms own the definitions a batch check evaluates (`realms`).
 */
export type AuthorizationCheckRealms = AuthorizationCheckSelector;

/**
 * Which clients own the definitions a batch check evaluates (`clients`).
 */
export type AuthorizationCheckClients = AuthorizationCheckSelector;

/**
 * One permission definition the identity may attempt, identified by its
 * `(name, realmId, clientId)` namespace, and the requested target realms it
 * may attempt it in. `realmId` / `clientId` are omitted when null (a global
 * definition). Never empty: a definition reaching no requested target realm
 * is absent from the answer entirely, so absent means denied.
 */
export type AuthorizationCheckPermission = {
    name: string,
    realmId?: string | null,
    clientId?: string | null,
    targetRealms: Array<string | null>,
};

/**
 * The answer `POST /authorization/check` serves: the caller's own verdicts,
 * paired with the target realms they hold in.
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
