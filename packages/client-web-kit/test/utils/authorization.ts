/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationDocument, AuthorizationIdentity } from '@authup/access';

export const AUTHORIZATION_SUBJECT = '245e3c5d-5747-4fbd-8554-c33d34780c58';
export const AUTHORIZATION_REALM = '0f3f6d6e-1b2c-4d5e-8f90-a1b2c3d4e5f6';

/**
 * The identity the document names. The identity policy's data validator
 * requires uuid ids, so a spec that EVALUATES through the document must
 * introspect these constants; one that merely commits it may name any
 * subject, as long as the introspection and the document agree.
 */
export function buildAuthorizationIdentity(
    overrides: Partial<AuthorizationIdentity> = {},
) : AuthorizationIdentity {
    return {
        id: AUTHORIZATION_SUBJECT,
        type: 'user',
        realm_id: AUTHORIZATION_REALM,
        realm_name: 'master',
        client_id: null,
        ...overrides,
    };
}

/**
 * A document whose one permission is gated like the server gates every
 * built-in permission (the `system.default` composite) and granted at `own`
 * reach, so a check carrying `realmMatch` settles per row.
 */
export function buildAuthorizationDocument(
    overrides: Partial<AuthorizationDocument> = {},
) : AuthorizationDocument {
    return {
        version: 1,
        identity: buildAuthorizationIdentity(),
        policies: {
            default: {
                type: 'composite',
                decisionStrategy: 'unanimous',
                children: [{ type: 'identity' }, { type: 'permissionBinding' }],
            },
        },
        permissions: [{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: ['default'],
            grants: [{ realm_scope: 'own', policies: [] }],
        }],
        ...overrides,
    };
}
