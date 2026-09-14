/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationCatalog } from '@authup/access';
import type { OAuth2TokenPermission } from '@authup/specs';

/**
 * The identity policy's data validator requires uuid ids, so a spec that
 * EVALUATES through the catalog must introspect these constants; one that
 * merely commits a session may name any subject.
 */
export const AUTHORIZATION_SUBJECT = '245e3c5d-5747-4fbd-8554-c33d34780c58';
export const AUTHORIZATION_REALM = '0f3f6d6e-1b2c-4d5e-8f90-a1b2c3d4e5f6';

/**
 * An identity-free catalog whose one definition is gated like the server
 * gates every built-in permission (the `system.default` composite). Who
 * holds it, and at which reach, is the introspection's business.
 */
export function buildAuthorizationCatalog(
    overrides: Partial<AuthorizationCatalog> = {},
) : AuthorizationCatalog {
    return {
        version: 1,
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
        }],
        ...overrides,
    };
}

/**
 * The grant list an introspection carries for the catalog's definition,
 * held at `own` reach, so a check carrying `realmMatch` settles per row.
 */
export function buildAuthorizationGrants() : OAuth2TokenPermission[] {
    return [{
        name: 'user_read',
        realm_id: null,
        client_id: null,
        realm_scope: 'own',
        policies: [],
    }];
}
