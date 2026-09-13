/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    AUTHORIZATION_DOCUMENT_VERSION,
    authorizationDocumentSchema,
} from '../../../src';

function createDocument(permissions: Record<string, any>[], policies: Record<string, any> = {}) {
    return {
        version: AUTHORIZATION_DOCUMENT_VERSION,
        identity: {
            id: 'u1',
            type: 'user',
            realm_id: 'r1',
            realm_name: 'master',
            client_id: null,
        },
        policies,
        permissions,
    };
}

describe('permission/authorization/schema', () => {
    it('accepts a document whose references are all declared', () => {
        const parsed = authorizationDocumentSchema.parse(createDocument(
            [{
                name: 'user_update',
                realm_id: null,
                client_id: null,
                decision_strategy: 'unanimous',
                policies: ['a'],
                grants: [{ realm_scope: 'own', policies: ['b'] }],
            }],
            {
                a: { type: 'identity', types: ['user'] },
                b: { type: 'composite', children: [] },
            },
        ));

        expect(parsed.permissions[0].policies).toEqual(['a']);
        expect(parsed.permissions[0].grants[0].policies).toEqual(['b']);
    });

    it('accepts a permission that names no policy at either layer', () => {
        expect(() => authorizationDocumentSchema.parse(createDocument([{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: [],
            grants: [{ realm_scope: 'any', policies: [] }],
        }]))).not.toThrow();
    });

    it('refuses a definition-layer id that no policy declares', () => {
        const result = authorizationDocumentSchema.safeParse(createDocument([{
            name: 'user_update',
            realm_id: null,
            client_id: null,
            decision_strategy: 'unanimous',
            policies: ['missing'],
            grants: [{ realm_scope: 'own', policies: [] }],
        }]));

        expect(result.success).toBeFalsy();
        expect(result.error?.issues).toHaveLength(1);
        expect(result.error?.issues[0].path).toEqual(['permissions', 0, 'policies', 0]);
        expect(result.error?.issues[0].message).toContain('missing');
    });

    it('refuses a grant-layer id that no policy declares', () => {
        const result = authorizationDocumentSchema.safeParse(createDocument(
            [{
                name: 'user_update',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: ['a'],
                grants: [
                    { realm_scope: 'own', policies: ['a'] },
                    { realm_scope: 'any', policies: ['gone'] },
                ],
            }],
            { a: { type: 'identity' } },
        ));

        expect(result.success).toBeFalsy();
        expect(result.error?.issues).toHaveLength(1);
        expect(result.error?.issues[0].path).toEqual(['permissions', 0, 'grants', 1, 'policies', 0]);
    });

    it('refuses an id that only a prototype member of the policy record answers', () => {
        const result = authorizationDocumentSchema.safeParse(createDocument([{
            name: 'user_update',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: ['constructor'],
            grants: [{ realm_scope: 'own', policies: ['toString'] }],
        }]));

        expect(result.success).toBeFalsy();
        expect(result.error?.issues).toHaveLength(2);
    });
});
