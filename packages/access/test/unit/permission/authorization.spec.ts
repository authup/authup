/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import type { AuthorizationEvaluatorInput, IdentityPolicyData } from '../../../src';
import {
    AuthorizationCatalogStaleError,
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
} from '../../../src';

const realmA = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const realmB = 'c641912c-21e5-4cb4-84b6-169e2b2bb024';
const clientA = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';
const clientB = 'c641912c-21e5-4cb4-84b6-169e2b2bb026';
type Policy = { type: string, [key: string]: unknown };
type Definition = {
    name: string,
    realm_id: string | null,
    client_id: string | null,
    decision_strategy: string | null,
    policies: string[] | null,
};
type Grant = {
    name?: string,
    realm_id?: string | null,
    client_id?: string | null,
    realm_scope?: string | null,
    policies?: string[] | null,
};

const identity : IdentityPolicyData = {
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    type: 'user',
    realmId: realmA,
    realmName: 'master',
    clientId: null,
};

function definition(policies: string[] | null = ['binding'], overrides: Partial<Definition> = {}) : Definition {
    return {
        name: 'event_read',
        realm_id: null,
        client_id: null,
        decision_strategy: null,
        policies,
        ...overrides,
    };
}

function catalog(
    definitions: string[] | Definition[] = ['binding'],
    policies: Record<string, Policy> = { binding: { type: 'permissionBinding' } },
) {
    const permissions : Definition[] = definitions.every((entry) => typeof entry === 'string') ?
        [definition(definitions as string[])] :
        definitions as Definition[];

    return {
        policies,
        permissions,
    };
}

function grants(...entries: Grant[]) {
    return entries.map((entry) => ({
        name: 'event_read',
        realm_id: null,
        client_id: null,
        ...entry,
    }));
}

function build(input: Partial<AuthorizationEvaluatorInput>) {
    return createAuthorizationEvaluator({
        catalog: catalog(),
        grants: grants({ realm_scope: 'any', policies: [] }),
        identity,
        ...input,
    });
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

describe('authorization catalog consumer', () => {
    it.each([
        ['none', [false, false, false]],
        ['own', [true, false, false]],
        ['ownOrNull', [true, false, true]],
        ['any', [true, true, true]],
    ] as const)('enforces %s for own, foreign and null realms, even in master', async (realmScope, expected) => {
        const evaluator = await build({ grants: grants({ realm_scope: realmScope, policies: [] }) });
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
        const evaluator = await build({
            catalog: catalog(['binding'], {
                binding: { type: 'permissionBinding' },
                visible: { type: 'attributes', query: { visible: { $eq: true } } },
            }),
            grants: grants(
                { realm_scope: 'own', policies: [] },
                { realm_scope: 'any', policies: ['visible'] },
            ),
        });
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
        const evaluator = await build({
            catalog: catalog(['binding'], {
                binding: { type: 'permissionBinding' },
                visible: { type: 'attributes', query: { visible: { $eq: true } } },
                hidden: { type: 'attributes', query: { visible: { $eq: false } } },
            }),
            grants: grants(
                { realm_scope: 'own', policies: ['visible'] },
                { realm_scope: 'any', policies: ['hidden'] },
            ),
        });
        expect(await allowed(evaluator, resource(realmB, true))).toBe(false);
        expect(await allowed(evaluator, resource(realmB, false))).toBe(true);
    });

    it('preserves nested definition policies and their decision strategy', async () => {
        const evaluator = await build({
            catalog: catalog(['nested'], {
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
            }),
        });
        expect(await allowed(evaluator, resource(realmB, false))).toBe(false);
        expect(await allowed(evaluator, resource(realmB, true))).toBe(true);
        expect((await evaluator.compile({ name: 'event_read' })).verdict).toBe('conditional');
    });

    it('matches exact namespaces without collapsing same-name definitions', async () => {
        const evaluator = await build({
            catalog: catalog([
                definition(),
                definition(['binding'], { realm_id: realmA, client_id: clientA }),
                definition(['binding'], { realm_id: realmB, client_id: clientA }),
            ]),
            grants: grants(
                { realm_scope: 'own', policies: [] },
                {
                    realm_id: realmA,
                    client_id: clientA,
                    realm_scope: 'any',
                    policies: [],
                },
                {
                    realm_id: realmB,
                    client_id: clientA,
                    realm_scope: 'none',
                    policies: [],
                },
            ),
        });
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
        const evaluator = await build({
            catalog: catalog(['binding'], {
                binding: { type: 'permissionBinding' },
                names: { type: 'attributeNames', names: ['visible'] },
            }),
            grants: grants(
                { realm_scope: 'own', policies: [] },
                { realm_scope: 'any', policies: ['names'] },
            ),
        });
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'post' });
        expect(await allowed(evaluator, resource(realmB))).toBe(false);
    });

    it('neutral-passes reach for a realm-less resource and prevents caller identity or policy-filter overrides', async () => {
        const evaluator = await build({ grants: grants({ realm_scope: 'own', policies: [] }) });
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
        const evaluator = await build({ grants: grants({ realm_scope: 'own', policies: [] }) });
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

    it('reports the catalog stale for a grant naming a definition it lacks', async () => {
        // the grants come from a fresh introspection: a definition the cached
        // catalog does not carry was created after the catalog was fetched
        await expect(build({
            grants: grants(
                { realm_scope: 'any', policies: [] },
                {
                    name: 'event_delete',
                    realm_scope: 'any',
                    policies: [],
                },
            ),
        })).rejects.toThrow(AuthorizationCatalogStaleError);
        await expect(build({
            grants: grants({
                realm_id: realmA,
                realm_scope: 'any',
                policies: [],
            }),
        })).rejects.toThrow(AuthorizationCatalogStaleError);
        await expect(build({ catalog: { ...catalog(), permissions: [] } }))
            .rejects.toThrow(AuthorizationCatalogStaleError);

        const empty = await build({ catalog: { ...catalog(), permissions: [] }, grants: [] });
        await expect(empty.preEvaluate({ name: 'event_read' })).rejects.toThrow();
        expect(await allowed(empty, resource(realmA))).toBe(false);
        expect(await empty.compile({ name: 'event_read' })).toEqual({ verdict: 'deny' });
    });

    it('drops a grant naming a definition the catalog carries unevaluable and denies it while a sibling still authorizes', async () => {
        // the server could not project the definition's policy layer, so it
        // carries the definition with policies: null; a refetch changes nothing
        const evaluator = await build({
            catalog: catalog([
                definition(),
                definition(null, { name: 'event_delete' }),
                definition(null, { realm_id: realmA }),
            ]),
            grants: grants(
                {
                    name: 'event_delete',
                    realm_scope: 'any',
                    policies: [],
                },
                {
                    realm_id: realmA,
                    realm_scope: 'any',
                    policies: [],
                },
                { realm_scope: 'any', policies: [] },
            ),
        });
        await expect(evaluator.preEvaluate({ name: 'event_delete' })).rejects.toThrow();
        await expect(evaluator.evaluate({ name: 'event_delete', data: resource(realmA) })).rejects.toThrow();
        expect(await evaluator.compile({ name: 'event_delete' })).toEqual({ verdict: 'deny' });
        await expect(evaluator.preEvaluate({ name: 'event_read', realmId: realmA })).rejects.toThrow();
        await expect(evaluator.evaluate({
            name: 'event_read',
            realmId: realmA,
            data: resource(realmA),
        })).rejects.toThrow();
        await expect(evaluator.preEvaluate({ name: 'event_read' })).resolves.toBeUndefined();
        await expect(evaluator.preEvaluateOneOf({ name: ['event_delete', 'event_read'] })).resolves.toBeUndefined();
        expect(await allowed(evaluator, resource(realmB))).toBe(true);

        // an unevaluable definition denies without a grant as well, and a
        // duplicate is refused whichever form it takes
        const ungranted = await build({ catalog: catalog([definition(null)]), grants: [] });
        await expect(ungranted.preEvaluate({ name: 'event_read' })).rejects.toThrow();
        expect(await allowed(ungranted, resource(realmA))).toBe(false);
        await expect(build({ catalog: catalog([definition(), definition(null)]) })).rejects.toThrow();
    });

    it('denies only the permissions whose catalog tree it cannot project, and never reports one stale', async () => {
        // the built-in policy type enum is closed while `auth_policies.type`
        // is a free string, so a type this copy does not know must deny the
        // permissions that use it rather than take the evaluator down for
        // every other one. A refetch cannot change it, so it is the
        // `policies: null` tombstone, never a stale catalog.
        const evaluator = await build({
            catalog: catalog([
                definition(['binding']),
                definition(['future'], { name: 'event_delete' }),
            ], {
                binding: { type: 'permissionBinding' },
                future: { type: 'plan109future' },
            }),
            grants: grants(
                { realm_scope: 'any', policies: [] },
                {
                    name: 'event_delete',
                    realm_scope: 'any',
                    policies: [],
                },
            ),
        });
        expect(await allowed(evaluator, resource(realmA))).toBe(true);
        await expect(evaluator.preEvaluate({ name: 'event_delete' })).rejects.toThrow();
        await expect(evaluator.evaluate({ name: 'event_delete', data: resource(realmA) })).rejects.toThrow();
        expect(await evaluator.compile({ name: 'event_delete' })).toEqual({ verdict: 'deny' });

        // a GRANT naming such a tree is dropped like one carrying a binding
        // check: the permission itself stays evaluable for another grant
        const junction = await build({
            catalog: catalog(['binding'], {
                binding: { type: 'permissionBinding' },
                future: { type: 'plan109future' },
            }),
            grants: grants(
                { realm_scope: 'any', policies: ['future'] },
                { realm_scope: 'own', policies: [] },
            ),
        });
        expect(await allowed(junction, resource(realmA))).toBe(true);
        expect(await allowed(junction, resource(realmB))).toBe(false);

        // the discrimination: a tree the catalog DECLARES but this copy
        // cannot project is not stale, while an id it does not declare is,
        // and only the second is the caller's to refetch for
        await expect(build({
            catalog: catalog(['binding'], { binding: { type: 'permissionBinding' } }),
            grants: grants({ realm_scope: 'any', policies: ['future'] }),
        })).rejects.toThrow(AuthorizationCatalogStaleError);
    });

    it.each<Record<string, Policy>>([
        { unprojectable: { type: 'plan109future' } },
        { unprojectable: { type: 'attributes', query: 'broken' } },
        { unprojectable: { type: 'composite', children: [{ type: 'plan109future' }] } },
    ])('denies rather than throws for a catalog tree it cannot project %#', async (policies) => {
        const evaluator = await build({ catalog: catalog(['unprojectable'], policies) });
        await expect(evaluator.preEvaluate({ name: 'event_read' })).rejects.toThrow();
        expect(await allowed(evaluator, resource(realmA))).toBe(false);
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'deny' });
    });

    it('evaluates without an identity: only a definition whose policies need none can pass', async () => {
        const document = catalog([
            definition(['open'], { name: 'open' }),
            definition(['closed'], { name: 'closed' }),
            definition(['binding'], { name: 'guarded' }),
            definition(['who'], { name: 'identified' }),
        ], {
            binding: { type: 'permissionBinding' },
            open: { type: 'date', start: '2000-01-01' },
            closed: { type: 'date', start: '2999-01-01' },
            who: { type: 'identity' },
        });
        const row = new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: null });

        const anonymous = await createAuthorizationEvaluator({ catalog: document });
        await expect(anonymous.preEvaluate({ name: 'open' })).resolves.toBeUndefined();
        await expect(anonymous.evaluate({ name: 'open', data: row })).resolves.toBeUndefined();
        expect(await anonymous.compile({ name: 'open' })).toEqual({ verdict: 'allow' });
        await expect(anonymous.preEvaluate({ name: 'closed' })).rejects.toThrow();
        await expect(anonymous.evaluate({ name: 'closed', data: row })).rejects.toThrow();
        await expect(anonymous.preEvaluate({ name: 'guarded' })).rejects.toThrow();
        await expect(anonymous.evaluate({ name: 'guarded', data: row })).rejects.toThrow();
        expect(await anonymous.compile({ name: 'guarded' })).toEqual({ verdict: 'deny' });

        // a caller cannot supply the identity the document did not prove:
        // the key is stripped here exactly as it is overwritten when one was
        const injected = new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: null });
        injected.set(BuiltInPolicyType.IDENTITY, {
            id: identity.id,
            type: 'user',
            realmId: realmA,
        });
        injected.setValidated(BuiltInPolicyType.IDENTITY);
        await expect(anonymous.evaluate({ name: 'identified', data: injected })).rejects.toThrow();

        const identified = await createAuthorizationEvaluator({
            catalog: document,
            grants: grants({
                name: 'guarded',
                realm_scope: 'any',
                policies: [],
            }),
            identity,
        });
        await expect(identified.preEvaluate({ name: 'guarded' })).resolves.toBeUndefined();
        await expect(identified.evaluate({ name: 'guarded', data: row })).resolves.toBeUndefined();
        expect(await identified.compile({ name: 'guarded' })).toEqual({ verdict: 'allow' });
        // the same definition passes for the identity the document proved
        await expect(identified.evaluate({ name: 'identified', data: row })).resolves.toBeUndefined();

        await expect(createAuthorizationEvaluator({
            catalog: document,
            grants: grants({ name: 'guarded', realm_scope: 'any' }),
        })).rejects.toThrow('Grants require the identity they belong to.');
    });

    // An inactive introspection names its subject and omits `permissions`, so
    // an identity with no grant list is exactly that response. Reading it as
    // "holds nothing" would authorize every definition carrying no binding
    // check, which is what `identified` is.
    it('refuses an identity with no grant list, and accepts an explicit empty one', async () => {
        const document = catalog(
            [definition(['binding'], { name: 'guarded' }), definition([], { name: 'identified' })],
            { binding: { type: 'permissionBinding' } },
        );

        await expect(createAuthorizationEvaluator({ catalog: document, identity }))
            .rejects.toThrow('An identity requires its grant list');

        const evaluator = await createAuthorizationEvaluator({
            catalog: document, 
            identity, 
            grants: [], 
        });
        const row = new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: null });
        await expect(evaluator.evaluate({ name: 'guarded', data: row })).rejects.toThrow();
        await expect(evaluator.evaluate({ name: 'identified', data: row })).resolves.toBeUndefined();
    });

    it('reports the catalog stale for a grant naming a policy it lacks', async () => {
        await expect(build({ grants: grants({ realm_scope: 'any', policies: ['missing'] }) }))
            .rejects.toThrow(AuthorizationCatalogStaleError);
        await expect(build({ grants: grants({ realm_scope: 'any', policies: ['constructor'] }) }))
            .rejects.toThrow(AuthorizationCatalogStaleError);
    });

    it('drops a grant whose junction tree carries a binding node while a sibling grant still authorizes', async () => {
        const policies = {
            binding: { type: 'permissionBinding' },
            nested: {
                type: 'composite',
                decisionStrategy: 'unanimous',
                children: [{ type: 'permissionBinding' }],
            },
        };
        const evaluator = await build({
            catalog: catalog(['binding'], policies),
            grants: grants(
                { realm_scope: 'any', policies: ['binding'] },
                { realm_scope: 'any', policies: ['nested'] },
                { realm_scope: 'own', policies: [] },
            ),
        });
        expect(await allowed(evaluator, resource(realmA))).toBe(true);
        expect(await allowed(evaluator, resource(realmB))).toBe(false);
        expect(await allowed(evaluator, resource(null))).toBe(false);

        const alone = await build({
            catalog: catalog(['binding'], policies),
            grants: grants({ realm_scope: 'any', policies: ['nested'] }),
        });
        expect(await allowed(alone, resource(realmA))).toBe(false);
        expect(await alone.compile({ name: 'event_read' })).toEqual({ verdict: 'deny' });
    });

    it('treats an absent or null reach as own and an absent policy list as none', async () => {
        for (const grant of [{}, { realm_scope: null }, { policies: null }, { realm_scope: null, policies: null }]) {
            const evaluator = await build({ grants: grants(grant) });
            expect(await Promise.all([realmA, realmB, null].map((realmId) => allowed(evaluator, resource(realmId)))))
                .toEqual([true, false, false]);
        }
    });

    it('refuses an identity that is neither a user nor a client, or carries no id', async () => {
        await expect(build({ identity: { ...identity, type: 'role' } })).rejects.toThrow();
        await expect(build({ identity: { ...identity, id: '' } })).rejects.toThrow();
    });

    it('refuses legacy and inactive-shaped inputs', async () => {
        await expect(build({ catalog: { active: true, permissions: [{ name: 'event_read' }] } })).rejects.toThrow();
        await expect(build({ catalog: undefined })).rejects.toThrow();
        await expect(build({ grants: null })).rejects.toThrow();
        await expect(build({ grants: { name: 'event_read' } })).rejects.toThrow();
    });

    it('composes several definition policies with the permission decision strategy', async () => {
        const policies = {
            binding: { type: 'permissionBinding' },
            clients: { type: 'identity', types: ['client'] },
        };
        const unanimous = catalog([definition(['binding', 'clients'], { decision_strategy: 'unanimous' })], policies);
        const affirmative = catalog([definition(['binding', 'clients'], { decision_strategy: 'affirmative' })], policies);

        expect(await allowed(await build({ catalog: unanimous }), resource(realmB))).toBe(false);
        expect(await allowed(await build({ catalog: affirmative }), resource(realmB))).toBe(true);
    });

    it('keeps invert true, drops invert null, and applies a nested invert through a composite', async () => {
        const query = { visible: { $eq: true } };
        const outcomes = async (visible: Policy) => {
            const evaluator = await build({ catalog: catalog(['binding', 'visible'], { binding: { type: 'permissionBinding' }, visible }) });

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

    it.each<Partial<AuthorizationEvaluatorInput>>([
        { catalog: { ...catalog(), permissions: [{ name: 'event_read' }] } },
        { grants: grants({ realm_scope: 'all', policies: [] }) },
    ])('rejects incomplete or unsupported authorization %#', async (input) => {
        await expect(build(input)).rejects.toThrow();
    });

    it('does not interpret an absent actor realm name as a global resource match', async () => {
        const evaluator = await build({
            catalog: catalog(['match'], { match: { type: 'realmMatch', attributeName: 'realmId' } }),
            identity: { ...identity, realmName: null },
        });
        expect(await allowed(evaluator, resource(null))).toBe(false);
        const compiled = await evaluator.compile({ name: 'event_read' });
        expect(compiled.verdict).toBe('conditional');
        if (compiled.verdict !== 'conditional') throw new Error('Expected a row condition');
        const predicate = compileFilters(compiled.condition as IFilter | IFilters, { caseSensitive: true });
        expect(predicate({ realmId: null })).toBeFalsy();
        expect(predicate({ realmId: realmA })).toBeTruthy();
    });

    it.each<[string[]]>([[[]], [['binding']]])('denies a definition the identity holds no grant for (%j)', async (policies) => {
        const evaluator = await build({ catalog: catalog(policies), grants: [] });
        expect(await allowed(evaluator, resource(realmA))).toBe(policies.length === 0);
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: policies.length === 0 ? 'allow' : 'deny' });
    });

    it('allows an empty permission catalog that denies every lookup', async () => {
        const evaluator = await build({ catalog: { ...catalog(), permissions: [] }, grants: [] });
        expect(await allowed(evaluator, resource(realmA))).toBe(false);
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'deny' });
    });

    it('rejects duplicate namespace definitions', async () => {
        await expect(build({ catalog: catalog([definition(), definition()]) })).rejects.toThrow();
    });

    it('denies through a childless composite definition, at the gate and on the row', async () => {
        const evaluator = await build({
            catalog: catalog(['empty'], {
                empty: {
                    type: 'composite',
                    decisionStrategy: 'unanimous',
                    children: [],
                },
            }),
        });
        expect(await allowed(evaluator, resource(realmA))).toBe(false);
        await expect(evaluator.preEvaluate({ name: 'event_read' })).rejects.toThrow();
    });

    it('reports post for a top-level attributes policy whose query cannot be lowered', async () => {
        const evaluator = await build({
            catalog: catalog(['binding', 'unsupported'], {
                binding: { type: 'permissionBinding' },
                unsupported: { type: 'attributes', query: { visible: { $unsupported: true } } },
            }),
        });
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'post' });
        expect(await allowed(evaluator, resource(realmA, true))).toBe(false);
    });

    it('forwards the decision strategy and refuses the policy bypass options', async () => {
        const evaluator = await build({
            catalog: catalog([
                definition(['binding'], { name: 'ok' }),
                definition(['binding'], { name: 'no' }),
            ]),
            grants: grants(
                {
                    name: 'ok', 
                    realm_scope: 'any', 
                    policies: [], 
                },
                {
                    name: 'no', 
                    realm_scope: 'none', 
                    policies: [], 
                },
            ),
        });
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
        const evaluator = await build({
            catalog: catalog([], {}),
            grants: grants({ realm_scope: 'none', policies: [] }),
        });
        for (const realmId of [realmA, realmB, null]) {
            await expect(evaluator.evaluate({ name: 'event_read', data: resource(realmId) })).resolves.toBeUndefined();
        }
        expect(await evaluator.compile({ name: 'event_read' })).toEqual({ verdict: 'allow' });
    });
});
