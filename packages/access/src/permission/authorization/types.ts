/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { RealmScope } from '../realm-scope';

export const AUTHORIZATION_DOCUMENT_VERSION = 1;

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

export type AuthorizationIdentity = {
    id: string,
    type: 'user' | 'client',
    realm_id: string | null,
    realm_name: string | null,
    client_id: string | null,
};

/**
 * One raw identity binding: the grant's realm reach paired with the ids of the
 * policy trees the junction row carries (none, or one).
 */
export type AuthorizationGrant = {
    realm_scope: `${RealmScope}`,
    policies: string[],
};

export type AuthorizationPermission = {
    name: string,
    realm_id: string | null,
    client_id: string | null,
    decision_strategy: `${DecisionStrategy}` | null,
    /**
     * The definition layer: the ids of the policy trees bound to the permission
     * definition (`auth_permission_policies`). Empty means unrestricted at this layer.
     */
    policies: string[],
    grants: AuthorizationGrant[],
};

export type AuthorizationDocument = {
    version: typeof AUTHORIZATION_DOCUMENT_VERSION,
    identity: AuthorizationIdentity,
    /**
     * Every policy tree the document references, keyed by the tree's own id and
     * present exactly once however many permissions or grants reference it.
     */
    policies: Record<string, AuthorizationPolicy>,
    permissions: AuthorizationPermission[],
};
