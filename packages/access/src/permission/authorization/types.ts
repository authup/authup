/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { IdentityPolicyData } from '../../policy';
import type { RealmScope } from '../realm-scope';

export const AUTHORIZATION_CATALOG_VERSION = 1;

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
     * definition (`auth_permission_policies`). Empty means unrestricted at this layer.
     */
    policies: string[],
};

/**
 * Identity-free and cacheable: every permission definition with its policy trees.
 */
export type AuthorizationCatalog = {
    version: typeof AUTHORIZATION_CATALOG_VERSION,
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
     * `AuthorizationGrant[]`, validated by the schema.
     */
    grants: unknown,
    identity: IdentityPolicyData,
};
