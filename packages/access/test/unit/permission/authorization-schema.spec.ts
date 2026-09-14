/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    AUTHORIZATION_CATALOG_VERSION,
    authorizationCatalogSchema,
    authorizationGrantsSchema,
} from '../../../src';

function createCatalog(permissions: Record<string, any>[], policies: Record<string, any> = {}) {
    return {
        version: AUTHORIZATION_CATALOG_VERSION,
        policies,
        permissions,
    };
}

describe('permission/authorization/schema', () => {
    it('accepts a catalog whose references are all declared', () => {
        const parsed = authorizationCatalogSchema.parse(createCatalog(
            [{
                name: 'user_update',
                realm_id: null,
                client_id: null,
                decision_strategy: 'unanimous',
                policies: ['a'],
            }],
            {
                a: { type: 'identity', types: ['user'] },
                b: { type: 'composite', children: [] },
            },
        ));

        expect(parsed.permissions[0].policies).toEqual(['a']);
        expect(parsed).not.toHaveProperty('identity');
    });

    it('accepts a definition that names no policy', () => {
        expect(() => authorizationCatalogSchema.parse(createCatalog([{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: [],
        }]))).not.toThrow();
    });

    it('refuses a definition id that no policy declares', () => {
        const result = authorizationCatalogSchema.safeParse(createCatalog([{
            name: 'user_update',
            realm_id: null,
            client_id: null,
            decision_strategy: 'unanimous',
            policies: ['missing'],
        }]));

        expect(result.success).toBeFalsy();
        expect(result.error?.issues).toHaveLength(1);
        expect(result.error?.issues[0].path).toEqual(['permissions', 0, 'policies', 0]);
        expect(result.error?.issues[0].message).toContain('missing');
    });

    it('refuses an id that only a prototype member of the policy record answers', () => {
        const result = authorizationCatalogSchema.safeParse(createCatalog([{
            name: 'user_update',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: ['constructor', 'toString'],
        }]));

        expect(result.success).toBeFalsy();
        expect(result.error?.issues).toHaveLength(2);
    });

    it('strips grants from a definition: they are no longer part of the catalog', () => {
        const parsed = authorizationCatalogSchema.parse(createCatalog([{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: [],
            grants: [{ realm_scope: 'any', policies: [] }],
        }]));

        expect(parsed.permissions[0]).not.toHaveProperty('grants');
    });

    it('accepts grants with an absent reach or policy list', () => {
        const parsed = authorizationGrantsSchema.parse([
            { name: 'user_read' },
            {
                name: 'user_read',
                realm_id: null,
                client_id: null,
                realm_scope: null,
                policies: null,
            },
            {
                name: 'user_update',
                realm_id: 'r1',
                client_id: 'c1',
                realm_scope: 'ownOrNull',
                policies: ['a'],
            },
        ]);

        expect(parsed).toHaveLength(3);
        expect(parsed[2].realm_scope).toEqual('ownOrNull');
        expect(parsed[2].policies).toEqual(['a']);
    });

    it('refuses a grant with an unknown reach, an empty name or a non-list', () => {
        expect(authorizationGrantsSchema.safeParse([{ name: 'user_read', realm_scope: 'all' }]).success).toBeFalsy();
        expect(authorizationGrantsSchema.safeParse([{ name: '' }]).success).toBeFalsy();
        expect(authorizationGrantsSchema.safeParse([{ name: 'user_read', policies: 'a' }]).success).toBeFalsy();
        expect(authorizationGrantsSchema.safeParse({ name: 'user_read' }).success).toBeFalsy();
        expect(authorizationGrantsSchema.safeParse(undefined).success).toBeFalsy();
    });
});
