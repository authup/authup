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
type Grant = { realm_scope: string, policies: string[] };

function document(
    grants: Grant[],
    policies: Record<string, Policy> = { binding: { type: 'permissionBinding' } },
    definition: string[] = ['binding'],
) {
    return {
        version: 1,
        identity: {
            id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
            type: 'user',
            realm_id: realmA,
            realm_name: 'master' as string | null,
            client_id: null,
        },
        policies,
        permissions: [{
            name: 'event_read',
            realm_id: null as string | null,
            client_id: null as string | null,
            decision_strategy: null as string | null,
            policies: definition,
            grants,
        }],
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

describe('authorization document consumer', () => {
    it.each([
        ['none', [false, false, false]],
        ['own', [true, false, false]],
        ['ownOrNull', [true, false, true]],
        ['any', [true, true, true]],
    ] as const)('enforces %s for own, foreign and null realms, even in master', async (realmScope, expected) => {
        const evaluator = await createAuthorizationEvaluator(document([{ realm_scope: realmScope, policies: [] }]));
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
        const evaluator = await createAuthorizationEvaluator(document(
            [
                { realm_scope: 'own', policies: [] },
                { realm_scope: 'any', policies: ['visible'] },
            ],
            {
                binding: { type: 'permissionBinding' },
                visible: { type: 'attributes', query: { visible: { $eq: true } } },
            },
        ));
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
        const evaluator = await createAuthorizationEvaluator(document(
            [
                { realm_scope: 'own', policies: ['visible'] },
                { realm_scope: 'any', policies: ['hidden'] },
            ],
            {
                binding: { type: 'permissionBinding' },
                visible: { type: 'attributes', query: { visible: { $eq: true } } },
                hidden: { type: 'attributes', query: { visible: { $eq: false } } },
            },
        ));
        expect(await allowed(evaluator, resource(realmB, true))).toBe(false);
        expect(await allowed(evaluator, resource(realmB, false))).toBe(true);
    });

    it('preserves nested definition policies and their decision strategy', async () => {
        const evaluator = await createAuthorizationEvaluator(document(
            [{ realm_scope: 'any', policies: [] }],
            {
                nested: {
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
                },
            },
            ['nested'],
        ));
        expect(await allowed(evaluator, resource(realmB, false))).toBe(false);
        expect(await allowed(evaluator, resource(realmB, true))).toBe(true);
        expect((await evaluator.compile({ name: 'event_read' })).verdict).toBe('conditional');
    });

    it('matches exact namespaces without collapsing same-name definitions', async () => {
        const input = document([{ realm_scope: 'own', policies: [] }]);
        input.permissions.push(
            {
                name: 'event_read',
                realm_id: realmA,
                client_id: clientA,
                decision_strategy: null,
                policies: ['binding'],
                grants: [{ realm_scope: 'any', policies: [] }],
            },
            {
                name: 'event_read',
                realm_id: realmB,
                client_id: clientA,
                decision_strategy: null,
                policies: ['binding'],
                grants: [{ realm_scope: 'none', policies: [] }],
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
        const evaluator = await createAuthorizationEvaluator(document(
            [
                { realm_scope: 'own', policies: [] },
                { realm_scope: 'any', policies: ['names'] },
            ],
            {
                binding: { type: 'permissionBinding' },
                names: { type: 'attributeNames', names: ['visible'] },
            },
        ));
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'post' });
        expect(await allowed(evaluator, resource(realmB))).toBe(false);
    });

    it('neutral-passes reach for a realm-less resource and prevents caller identity or policy-filter overrides', async () => {
        const evaluator = await createAuthorizationEvaluator(document([{ realm_scope: 'own', policies: [] }]));
        // no REALM_MATCH key: the resource has no realm dimension, so reach
        // neutral-passes exactly as server-core's resourceRealmMatch does
        await expect(evaluator.evaluate({ name: 'event_read' })).resolves.toBeUndefined();
        // a present key is still validated
        await expect(evaluator.evaluate({
            name: 'event_read',
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: 5 }),
        })).rejects.toThrow();
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

    it('exposes the pre-gate: reach settles when the resource realm is known, passes when it is not', async () => {
        const evaluator = await createAuthorizationEvaluator(document([{ realm_scope: 'own', policies: [] }]));
        await expect(evaluator.preEvaluateOneOf({ name: 'event_read' })).resolves.toBeUndefined();
        await expect(evaluator.preEvaluateOneOf({
            name: 'event_read',
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmA }),
        })).resolves.toBeUndefined();
        await expect(evaluator.preEvaluate({
            name: 'event_read',
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmB }),
        })).rejects.toThrow();
        await expect(evaluator.preEvaluate({ name: 'unknown_permission' })).rejects.toThrow();
    });

    it('refuses a policy id the document does not carry, and a grant referencing a binding check', async () => {
        await expect(createAuthorizationEvaluator(document([{ realm_scope: 'any', policies: ['missing'] }])))
            .rejects.toThrow();
        await expect(createAuthorizationEvaluator(document([{ realm_scope: 'any', policies: ['binding'] }])))
            .rejects.toThrow();
        await expect(createAuthorizationEvaluator(document(
            [{ realm_scope: 'any', policies: ['nested'] }],
            {
                binding: { type: 'permissionBinding' },
                nested: {
                    type: 'composite',
                    decisionStrategy: 'unanimous',
                    children: [{ type: 'permissionBinding' }],
                },
            },
        ))).rejects.toThrow();
    });

    it('refuses legacy, inactive-shaped and unknown-version inputs', async () => {
        await expect(createAuthorizationEvaluator({ active: true, permissions: [{ name: 'event_read' }] })).rejects.toThrow();
        await expect(createAuthorizationEvaluator({ ...document([{ realm_scope: 'any', policies: [] }]), version: 2 })).rejects.toThrow();
        await expect(createAuthorizationEvaluator(undefined)).rejects.toThrow();
    });

    it('composes several definition policies with the permission decision strategy', async () => {
        const policies = {
            binding: { type: 'permissionBinding' },
            clients: { type: 'identity', types: ['client'] },
        };
        const unanimous = document([{ realm_scope: 'any', policies: [] }], policies, ['binding', 'clients']);
        unanimous.permissions[0]!.decision_strategy = 'unanimous';
        const affirmative = document([{ realm_scope: 'any', policies: [] }], policies, ['binding', 'clients']);
        affirmative.permissions[0]!.decision_strategy = 'affirmative';

        expect(await allowed(await createAuthorizationEvaluator(unanimous), resource(realmB))).toBe(false);
        expect(await allowed(await createAuthorizationEvaluator(affirmative), resource(realmB))).toBe(true);
    });

    it('keeps invert true, drops invert null, and applies a nested invert through a composite', async () => {
        const query = { visible: { $eq: true } };
        const outcomes = async (visible: Policy) => {
            const evaluator = await createAuthorizationEvaluator(document(
                [{ realm_scope: 'any', policies: [] }],
                { binding: { type: 'permissionBinding' }, visible },
                ['binding', 'visible'],
            ));

            return [
                await allowed(evaluator, resource(realmB, true)),
                await allowed(evaluator, resource(realmB, false)),
            ];
        };

        expect(await outcomes({
            type: 'attributes',
            query,
            invert: null,
        })).toEqual([true, false]);
        expect(await outcomes({
            type: 'attributes',
            query,
            invert: true,
        })).toEqual([false, true]);
        expect(await outcomes({
            type: 'composite',
            decisionStrategy: 'unanimous',
            invert: null,
            children: [{
                type: 'attributes',
                query,
                invert: true,
            }],
        })).toEqual([false, true]);
    });

    it.each([
        { ...document([]), identity: undefined },
        { ...document([]), permissions: [{ name: 'event_read' }] },
        document([{ realm_scope: 'all', policies: [] }]),
        document(
            [{ realm_scope: 'any', policies: ['nested'] }],
            {
                binding: { type: 'permissionBinding' },
                nested: { type: 'composite', children: [{ type: 'permissionBinding' }] },
            },
        ),
        document([{ realm_scope: 'any', policies: [] }], { custom: { type: 'custom', invert: true } }, ['custom']),
        document([{ realm_scope: 'any', policies: [] }], { broken: { type: 'attributes', query: 'broken' } }, ['broken']),
        document(
            [{ realm_scope: 'any', policies: [] }],
            { custom: { type: 'composite', children: [{ type: 'custom' }] } },
            ['custom'],
        ),
    ])('rejects incomplete or unsupported authorization %#', async (input) => {
        await expect(createAuthorizationEvaluator(input)).rejects.toThrow();
    });

    it('does not interpret an absent actor realm name as a global resource match', async () => {
        const input = document(
            [{ realm_scope: 'any', policies: [] }],
            { match: { type: 'realmMatch', attributeName: 'realmId' } },
            ['match'],
        );
        input.identity.realm_name = null;
        const evaluator = await createAuthorizationEvaluator(input);
        expect(await allowed(evaluator, resource(null))).toBe(false);
        const compiled = await evaluator.compile({ name: 'event_read' });
        expect(compiled.verdict).toBe('conditional');
        if (compiled.verdict !== 'conditional') throw new Error('Expected a row condition');
        const predicate = compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true });
        expect(predicate({ realmId: null })).toBeFalsy();
        expect(predicate({ realmId: realmA })).toBeTruthy();
    });

    it.each<[string[]]>([[[]], [['binding']]])('rejects a permission entry without grants (%j)', async (definition) => {
        await expect(createAuthorizationEvaluator(document([], undefined, definition))).rejects.toThrow();
    });

    it('allows an empty permission catalog that denies every lookup', async () => {
        const input = document([]);
        input.permissions = [];
        const evaluator = await createAuthorizationEvaluator(input);
        expect(await allowed(evaluator, resource(realmA))).toBe(false);
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'deny' });
    });

    it('rejects missing restrictions and duplicate namespace definitions', async () => {
        const input = document([{ realm_scope: 'any', policies: [] }]);
        const malformed = JSON.parse(JSON.stringify(input));
        delete malformed.permissions[0].grants[0].policies;
        await expect(createAuthorizationEvaluator(malformed)).rejects.toThrow();
        input.permissions.push(input.permissions[0]!);
        await expect(createAuthorizationEvaluator(input)).rejects.toThrow();
    });

    it('denies through a childless composite definition, at the gate and on the row', async () => {
        const evaluator = await createAuthorizationEvaluator(document(
            [{ realm_scope: 'any', policies: [] }],
            {
                empty: {
                    type: 'composite', 
                    decisionStrategy: 'unanimous', 
                    children: [], 
                }, 
            },
            ['empty'],
        ));
        expect(await allowed(evaluator, resource(realmA))).toBe(false);
        await expect(evaluator.preEvaluate({ name: 'event_read' })).rejects.toThrow();
    });

    it('reports post for a top-level attributes policy whose query cannot be lowered', async () => {
        const evaluator = await createAuthorizationEvaluator(document(
            [{ realm_scope: 'any', policies: [] }],
            {
                binding: { type: 'permissionBinding' },
                unsupported: { type: 'attributes', query: { visible: { $unsupported: true } } },
            },
            ['binding', 'unsupported'],
        ));
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'post' });
        expect(await allowed(evaluator, resource(realmA, true))).toBe(false);
    });

    it('forwards the decision strategy and refuses the policy bypass options', async () => {
        const input = document([{ realm_scope: 'any', policies: [] }]);
        input.permissions[0]!.name = 'ok';
        input.permissions.push({
            name: 'no',
            realm_id: null,
            client_id: null,
            decision_strategy: null,
            policies: ['binding'],
            grants: [{ realm_scope: 'none', policies: [] }],
        });
        const evaluator = await createAuthorizationEvaluator(input);
        const data = resource(realmB);

        await expect(evaluator.evaluate({
            name: ['ok', 'no'],
            options: { decisionStrategy: 'affirmative' },
            data,
        })).resolves.toBeUndefined();
        await expect(evaluator.evaluate({ name: ['ok', 'no'], data })).rejects.toThrow();
        await expect(evaluator.evaluate({
            name: 'ok',
            options: { policiesExcluded: ['x'] },
            data,
        })).rejects.toThrow('The authorization evaluator does not accept policy bypass options.');
        await expect(evaluator.preEvaluate({
            name: 'ok',
            options: { pendingPolicies: 'permit' },
        })).rejects.toThrow('The authorization evaluator does not accept policy bypass options.');
    });

    it('is unrestricted when the definition carries no binding check', async () => {
        const evaluator = await createAuthorizationEvaluator(document([{ realm_scope: 'none', policies: [] }], {}, []));
        for (const realmId of [realmA, realmB, null]) {
            await expect(evaluator.evaluate({ name: 'event_read', data: resource(realmId) })).resolves.toBeUndefined();
        }
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'allow' });
    });
});
