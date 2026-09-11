/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import {
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
} from '../../../src';

const realmA = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const realmB = 'c641912c-21e5-4cb4-84b6-169e2b2bb024';
const clientA = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';
const clientB = 'c641912c-21e5-4cb4-84b6-169e2b2bb026';
type Policy = { type: string, [key: string]: unknown };
type Grant = { realm_scope: string, policy: Policy | null };

function snapshot(grants: Grant[], policy: Policy | null = { type: 'permissionBinding' }) {
    return {
        active: true,
        kind: 'access_token',
        scope: 'global',
        authorization: {
            version: 1,
            identity: {
                id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                type: 'user',
                realm_id: realmA,
                realm_name: 'master' as string | null,
                client_id: null,
            },
            permissions: [{
                name: 'event_read',
                realm_id: null as string | null,
                client_id: null as string | null,
                policy,
                grants,
            }],
        },
    };
}

function resource(realmId: string | null, visible = false) {
    return new PolicyData({
        [BuiltInPolicyType.REALM_MATCH]: realmId,
        [BuiltInPolicyType.ATTRIBUTES]: { realmId, visible },
    });
}

async function allowed(evaluator: Awaited<ReturnType<typeof createAuthorizationEvaluator>>, data: PolicyData) {
    try {
        await evaluator.evaluate({ name: 'event_read', data });
        return true;
    } catch {
        return false;
    }
}

describe('introspection authorization consumer', () => {
    it.each([
        ['none', [false, false, false]],
        ['own', [true, false, false]],
        ['ownOrNull', [true, false, true]],
        ['any', [true, true, true]],
    ] as const)('enforces %s for own, foreign and null realms, even in master', async (realmScope, expected) => {
        const evaluator = await createAuthorizationEvaluator(snapshot([{ realm_scope: realmScope, policy: null }]));
        const rows = [realmA, realmB, null].map((realmId) => ({ realmId }));
        expect(await Promise.all(rows.map((row) => allowed(evaluator, resource(row.realmId))))).toEqual(expected);
        const compiled = await evaluator.compile({ name: 'event_read' });
        expect(compiled.verdict).not.toBe('post');
        const predicate = compiled.verdict === 'conditional' ?
            compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true }) :
            () => compiled.verdict === 'allow';
        expect(rows.map((row) => !!predicate(row))).toEqual(expected);
    });

    it('keeps each reach paired with its policy and filters before pagination and total', async () => {
        const evaluator = await createAuthorizationEvaluator(snapshot([
            { realm_scope: 'own', policy: null },
            { realm_scope: 'any', policy: { type: 'attributes', query: { visible: { $eq: true } } } },
        ]));
        const rows = [
            {
                id: 1,
                realmId: realmB,
                visible: false,
            },
            {
                id: 2,
                realmId: realmA,
                visible: false,
            },
            {
                id: 3,
                realmId: realmB,
                visible: true,
            },
            {
                id: 4,
                realmId: null,
                visible: false,
            },
        ];
        expect(await Promise.all(rows.map((row) => allowed(evaluator, resource(row.realmId, row.visible)))))
            .toEqual([false, true, true, false]);
        const compiled = await evaluator.compile({ name: 'event_read' });
        expect(compiled.verdict).toBe('conditional');
        if (compiled.verdict !== 'conditional') throw new Error('Expected a row condition');
        const predicate = compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true });
        const authorized = rows.filter(predicate);
        expect({ items: authorized.slice(0, 1).map((row) => row.id), total: authorized.length })
            .toEqual({ items: [2], total: 2 });
    });

    it('does not lend a wider reach to a passing narrow policy', async () => {
        const evaluator = await createAuthorizationEvaluator(snapshot([
            { realm_scope: 'own', policy: { type: 'attributes', query: { visible: { $eq: true } } } },
            { realm_scope: 'any', policy: { type: 'attributes', query: { visible: { $eq: false } } } },
        ]));
        expect(await allowed(evaluator, resource(realmB, true))).toBe(false);
        expect(await allowed(evaluator, resource(realmB, false))).toBe(true);
    });

    it('preserves nested definition policies and their decision strategy', async () => {
        const evaluator = await createAuthorizationEvaluator(snapshot([{ realm_scope: 'any', policy: null }], {
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [
                {
                    type: 'composite',
                    decisionStrategy: 'affirmative',
                    children: [
                        { type: 'permissionBinding' },
                        { type: 'identity', types: ['client'] },
                    ],
                },
                { type: 'attributes', query: { visible: { $eq: true } } },
            ],
        }));
        expect(await allowed(evaluator, resource(realmB, false))).toBe(false);
        expect(await allowed(evaluator, resource(realmB, true))).toBe(true);
        expect((await evaluator.compile({ name: 'event_read' })).verdict).toBe('conditional');
    });

    it('matches exact namespaces without collapsing same-name definitions', async () => {
        const input = snapshot([{ realm_scope: 'own', policy: null }]);
        input.authorization.permissions.push(
            {
                name: 'event_read',
                realm_id: realmA,
                client_id: clientA,
                policy: { type: 'permissionBinding' },
                grants: [{ realm_scope: 'any', policy: null }],
            },
            {
                name: 'event_read',
                realm_id: realmB,
                client_id: clientA,
                policy: { type: 'permissionBinding' },
                grants: [{ realm_scope: 'none', policy: null }],
            },
        );
        const evaluator = await createAuthorizationEvaluator(input);
        expect(await allowed(evaluator, resource(realmB))).toBe(false);
        await expect(evaluator.evaluate({
            name: 'event_read',
            realmId: realmA,
            clientId: clientA,
            data: resource(realmB),
        })).resolves.toBeUndefined();
        await expect(evaluator.evaluate({
            name: 'event_read',
            realmId: realmB,
            clientId: clientA,
            data: resource(realmB),
        })).rejects.toThrow();
        await expect(evaluator.evaluate({
            name: 'event_read',
            realmId: realmA,
            clientId: clientB,
            data: resource(realmB),
        })).rejects.toThrow();
        expect(await evaluator.compile({
            name: 'event_read',
            realmId: realmA,
            clientId: null,
        })).toEqual({ verdict: 'deny' });
    });

    it('reports post when a pending restriction cannot be lowered', async () => {
        const evaluator = await createAuthorizationEvaluator(snapshot([
            { realm_scope: 'own', policy: null },
            { realm_scope: 'any', policy: { type: 'attributeNames', names: ['visible'] } },
        ]));
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'post' });
        expect(await allowed(evaluator, resource(realmB))).toBe(false);
    });

    it('requires resource realm data and prevents caller identity or policy-filter overrides', async () => {
        const evaluator = await createAuthorizationEvaluator(snapshot([{ realm_scope: 'own', policy: null }]));
        await expect(evaluator.evaluate({ name: 'event_read' })).rejects.toThrow();
        const data = resource(realmB);
        data.set(BuiltInPolicyType.IDENTITY, {
            id: clientA,
            type: 'client',
            realmId: realmB,
        });
        data.setValidated(BuiltInPolicyType.IDENTITY);
        await expect(evaluator.evaluate({
            name: 'event_read',
            data,
            options: { policiesExcluded: ['permissionBinding'] },
        })).rejects.toThrow();
        await expect(evaluator.evaluate({ name: 'event_read', data })).rejects.toThrow();
        expect(await evaluator.compile({ name: 'missing' })).toEqual({ verdict: 'deny' });
        await expect(evaluator.compile({ name: 'event_read', data: resource(realmA) })).rejects.toThrow();
    });

    it.each([
        undefined,
        { active: false },
        { active: true, permissions: [{ name: 'event_read' }] },
        { ...snapshot([]), active: false },
        {
            active: true,
            kind: 'access_token',
            scope: 'global',
            authorization: { ...snapshot([]).authorization, version: 2 },
        },
        {
            active: true,
            kind: 'access_token',
            scope: 'global',
            authorization: { ...snapshot([]).authorization, identity: undefined },
        },
        {
            active: true,
            kind: 'access_token',
            scope: 'global',
            authorization: { ...snapshot([]).authorization, permissions: [{ name: 'event_read' }] },
        },
        snapshot([{ realm_scope: 'all', policy: null }]),
        snapshot([{ realm_scope: 'any', policy: { type: 'composite', children: [{ type: 'permissionBinding' }] } }]),
        snapshot([{ realm_scope: 'any', policy: null }], { type: 'custom', invert: true }),
        snapshot([{ realm_scope: 'any', policy: null }], { type: 'composite', children: [] }),
        snapshot([{ realm_scope: 'any', policy: null }], { type: 'attributes', query: 'broken' }),
        snapshot([{ realm_scope: 'any', policy: null }], { type: 'attributes', query: { visible: { $unsupported: true } } }),
        snapshot([{ realm_scope: 'any', policy: null }], { type: 'composite', children: [{ type: 'custom' }] }),
    ])('rejects incomplete, inactive or unsupported authorization %#', async (input) => {
        await expect(createAuthorizationEvaluator(input)).rejects.toThrow();
    });

    it.each(['mfa_token', 'refresh_token', 'id_token', 'logout_token', 'unknown'])('rejects %s as a resource credential', async (kind) => {
        await expect(createAuthorizationEvaluator({ ...snapshot([{ realm_scope: 'any', policy: null }]), kind })).rejects.toThrow();
    });

    it('requires global scope and an access token or a session context', async () => {
        const input = snapshot([{ realm_scope: 'any', policy: null }]);
        await expect(createAuthorizationEvaluator({ ...input, scope: 'openid' })).rejects.toThrow();
        await expect(createAuthorizationEvaluator({ ...input, scope: undefined })).rejects.toThrow();
        await expect(createAuthorizationEvaluator({ ...input, kind: undefined })).rejects.toThrow();
        const session = await createAuthorizationEvaluator({
            ...input,
            kind: undefined,
            session_id: clientA,
        });
        expect(await allowed(session, resource(realmB))).toBe(true);
    });

    it('does not interpret an absent actor realm name as a global resource match', async () => {
        const input = snapshot([{ realm_scope: 'any', policy: null }], { type: 'realmMatch', attributeName: 'realmId' });
        input.authorization.identity.realm_name = null;
        const evaluator = await createAuthorizationEvaluator(input);
        expect(await allowed(evaluator, resource(null))).toBe(false);
        const compiled = await evaluator.compile({ name: 'event_read' });
        expect(compiled.verdict).toBe('conditional');
        if (compiled.verdict !== 'conditional') throw new Error('Expected a row condition');
        const predicate = compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true });
        expect(predicate({ realmId: null })).toBeFalsy();
        expect(predicate({ realmId: realmA })).toBeTruthy();
    });

    it('rejects missing restrictions and duplicate namespace definitions', async () => {
        const input = snapshot([{ realm_scope: 'any', policy: null }]);
        const malformed = JSON.parse(JSON.stringify(input));
        delete malformed.authorization.permissions[0].grants[0].policy;
        await expect(createAuthorizationEvaluator(malformed)).rejects.toThrow();
        input.authorization.permissions.push(input.authorization.permissions[0]!);
        await expect(createAuthorizationEvaluator(input)).rejects.toThrow();
    });
});
