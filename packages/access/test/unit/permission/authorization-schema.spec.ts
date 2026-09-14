/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isValidupError } from 'validup';
import { describe, expect, it } from 'vitest';
import {
    AUTHORIZATION_CATALOG_VERSION,
    parseAuthorizationEvaluatorInput,
} from '../../../src';

function createCatalog(permissions: Record<string, any>[], policies: Record<string, any> = {}) {
    return {
        version: AUTHORIZATION_CATALOG_VERSION,
        policies,
        permissions,
    };
}

async function issuesOf(fn: () => Promise<unknown>) {
    try {
        await fn();
    } catch (e) {
        if (isValidupError(e)) {
            return e.issues;
        }

        throw e;
    }

    throw new Error('Expected the input to be refused.');
}

const identity = { id: 'u1', type: 'user' as const };

function parseCatalog(catalog: unknown) {
    return parseAuthorizationEvaluatorInput({ catalog }).then((parsed) => parsed.catalog);
}

function parseGrants(grants: unknown) {
    return parseAuthorizationEvaluatorInput({
        catalog: createCatalog([]), 
        grants, 
        identity, 
    })
        .then((parsed) => parsed.grants);
}

describe('permission/authorization/schema', () => {
    it('accepts a catalog whose references are all declared', async () => {
        const parsed = await parseCatalog(createCatalog(
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

        expect(parsed.permissions[0]!.policies).toEqual(['a']);
        expect(parsed).not.toHaveProperty('identity');
        // the loose policy node keeps its type's own configuration
        expect(parsed.policies.a).toEqual({ type: 'identity', types: ['user'] });
        expect(parsed.policies.b).toEqual({ type: 'composite', children: [] });
    });

    it('accepts a definition that names no policy, and one carrying the null tombstone', async () => {
        await expect(parseCatalog(createCatalog([{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: [],
        }]))).resolves.toBeDefined();

        const tombstoned = await parseCatalog(createCatalog([{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: null,
        }]));

        expect(tombstoned.permissions[0]!.policies).toBeNull();
    });

    it('refuses a definition id that no policy declares', async () => {
        const issues = await issuesOf(() => parseCatalog(createCatalog([{
            name: 'user_update',
            realm_id: null,
            client_id: null,
            decision_strategy: 'unanimous',
            policies: ['missing'],
        }])));

        expect(issues).toHaveLength(1);
        expect(issues[0]!.path).toEqual(['catalog', 'permissions', 0, 'policies', 0]);
        expect(issues[0]!.message).toContain('missing');
    });

    it('refuses an id that only a prototype member of the policy record answers', async () => {
        const issues = await issuesOf(() => parseCatalog(createCatalog([{
            name: 'user_update',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: ['constructor'],
        }])));

        expect(issues[0]!.message).toContain('constructor');
    });

    it('reports the entry a malformed definition sits at', async () => {
        const issues = await issuesOf(() => parseCatalog(createCatalog([
            {
                name: 'user_read',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: [],
            },
            {
                name: '',
                realm_id: null,
                client_id: null,
                decision_strategy: null,
                policies: [],
            },
        ])));

        expect(issues[0]!.path).toEqual(['catalog', 'permissions', 1, 'name']);
    });

    it('strips grants from a definition: they are no longer part of the catalog', async () => {
        const parsed = await parseCatalog(createCatalog([{
            name: 'user_read',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: [],
            grants: [{ realm_scope: 'any', policies: [] }],
        }]));

        expect(parsed.permissions[0]).not.toHaveProperty('grants');
    });

    it('refuses a catalog that is not an object, and a version it does not know', async () => {
        await expect(parseCatalog([])).rejects.toThrow();
        await expect(parseCatalog(null)).rejects.toThrow();
        await expect(parseCatalog({ ...createCatalog([]), version: 2 })).rejects.toThrow();
    });

    it('accepts grants with an absent reach or policy list', async () => {
        const parsed = await parseGrants([
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
        expect(parsed[2]!.realm_scope).toEqual('ownOrNull');
        expect(parsed[2]!.policies).toEqual(['a']);
    });

    it('refuses a grant with an unknown reach, an empty name or a non-list', async () => {
        await expect(parseGrants([{ name: 'user_read', realm_scope: 'all' }])).rejects.toThrow();
        await expect(parseGrants([{ name: '' }])).rejects.toThrow();
        await expect(parseGrants([{ name: 'user_read', policies: 'a' }])).rejects.toThrow();
        await expect(parseGrants({ name: 'user_read' })).rejects.toThrow();
        await expect(parseGrants(undefined)).rejects.toThrow();
    });

    it('reports the entry a malformed grant sits at', async () => {
        const issues = await issuesOf(() => parseGrants([
            { name: 'user_read' },
            { name: 'user_read', realm_scope: 'all' },
        ]));

        expect(issues[0]!.path).toEqual(['grants', 1, 'realm_scope']);
    });
});
