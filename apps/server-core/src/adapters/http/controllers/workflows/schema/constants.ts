/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';

/**
 * The collection path each registered schema is served under as
 * `GET /<collection>/@schema`. Every registered schema but the owner-scoped
 * user authenticator (`/users/:id/authenticators`) has one; the bulk
 * `GET /schemas` still describes it.
 */
export const SCHEMA_COLLECTIONS: Record<string, `${EntityType}`> = {
    clients: EntityType.CLIENT,
    'client-permissions': EntityType.CLIENT_PERMISSION,
    'client-roles': EntityType.CLIENT_ROLE,
    'client-scopes': EntityType.CLIENT_SCOPE,
    consents: EntityType.CONSENT,
    events: EntityType.EVENT,
    'identity-providers': EntityType.IDENTITY_PROVIDER,
    'identity-provider-accounts': EntityType.IDENTITY_PROVIDER_ACCOUNT,
    'identity-provider-role-mappings': EntityType.IDENTITY_PROVIDER_ROLE_MAPPING,
    keys: EntityType.KEY,
    paths: EntityType.PATH,
    permissions: EntityType.PERMISSION,
    'permission-policies': EntityType.PERMISSION_POLICY,
    policies: EntityType.POLICY,
    realms: EntityType.REALM,
    roles: EntityType.ROLE,
    'role-attributes': EntityType.ROLE_ATTRIBUTE,
    'role-permissions': EntityType.ROLE_PERMISSION,
    scopes: EntityType.SCOPE,
    sessions: EntityType.SESSION,
    'session-tokens': EntityType.SESSION_TOKEN,
    'trust-anchors': EntityType.TRUST_ANCHOR,
    users: EntityType.USER,
    'user-attributes': EntityType.USER_ATTRIBUTE,
    'user-permissions': EntityType.USER_PERMISSION,
    'user-roles': EntityType.USER_ROLE,
};
