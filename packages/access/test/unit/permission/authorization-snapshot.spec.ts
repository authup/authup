/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IssueGroup } from '@ebec/core';
import { createValidator } from '@validup/zod';
import { Container, isValidupError } from 'validup';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type {
    AuthorizationSnapshot,
    IPermissionEvaluator,
    IPolicyEvaluator,
    IdentityPolicyData,
    PermissionCompileContext,
    PermissionEvaluationContext,
    PermissionPolicyBinding,
} from '../../../src';
import {
    AUTHORIZATION_POLICY_WITHHELD_TYPE,
    AuthorizationCatalogStaleError,
    BuiltInPolicyType,
    PolicyData,
    PolicyDefaultEvaluators,
    PolicyDefaultValidators,
    buildAuthorizationSnapshot,
    createAuthorizationEvaluator,
    createAuthorizationSnapshotEvaluator,
    isPermissionError,
} from '../../../src';

class StampPolicyValidator extends Container<{ at: Date }> {
    override initialize() {
        super.initialize();

        this.mount('at', createValidator(z.date()));
    }
}

const realmA = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const realmB = 'c641912c-21e5-4cb4-84b6-169e2b2bb024';

const identity : IdentityPolicyData = {
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    type: 'user',
    realmId: realmA,
    realmName: 'master',
    clientId: null,
};

type Policy = { type: string, [key: string]: unknown };
type Definition = {
    name: string,
    realmId: string | null,
    clientId: string | null,
    decisionStrategy: string | null,
    policies: string[] | null,
};

function definition(name: string, policies: string[] | null, overrides: Partial<Definition> = {}) : Definition {
    return {
        name,
        realmId: null,
        clientId: null,
        decisionStrategy: null,
        policies,
        ...overrides,
    };
}

function grant(name: string, realmScope: string, policies: string[] = []) {
    return {
        name,
        realm_id: null,
        client_id: null,
        realm_scope: realmScope,
        policies,
    };
}

function binding(name: string, policies?: Policy[], extra: Partial<PermissionPolicyBinding> = {}) : PermissionPolicyBinding {
    return {
        permission: {
            name,
            realmId: null,
            clientId: null,
        },
        ...(policies ? { policies } : {}),
        ...extra,
    };
}

const passes : Policy = { type: 'identity', types: ['user'] };
const fails : Policy = { type: 'identity', types: ['client'] };

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

async function allowed(
    evaluator: IPermissionEvaluator,
    ctx: PermissionEvaluationContext,
    method: 'evaluate' | 'preEvaluate' = 'evaluate',
) {
    try {
        await evaluator[method](ctx);

        return true;
    } catch (e) {
        if (isPermissionError(e)) {
            return false;
        }

        throw e;
    }
}

function resource(realmId: string | null, visible: boolean) {
    return new PolicyData({
        [BuiltInPolicyType.REALM_MATCH]: realmId,
        [BuiltInPolicyType.ATTRIBUTES]: { realmId, visible },
    });
}

const parityCatalog = {
    policies: {
        default: {
            type: 'composite',
            decisionStrategy: 'unanimous',
            children: [
                { type: 'permissionBinding' },
                { type: 'identity' },
            ],
        },
        visible: { type: 'attributes', query: { visible: { $eq: true } } },
        user: { type: 'identity', types: ['user'] },
    },
    permissions: [
        definition('event_read', ['default']),
        definition('event_update', ['default']),
        definition('event_delete', ['default'], { realmId: realmA }),
        definition('open', []),
    ],
};

const parityGrants = [
    grant('event_read', 'own'),
    grant('event_read', 'any', ['visible']),
    grant('event_update', 'ownOrNull', ['user']),
    { ...grant('event_delete', 'any'), realm_id: realmA },
];

function parityContexts() : PermissionEvaluationContext[] {
    const contexts : PermissionEvaluationContext[] = [];

    for (const name of ['event_read', 'event_update', 'event_delete', 'open', 'unknown']) {
        for (const realmId of [undefined, realmA]) {
            contexts.push({ name, realmId });

            for (const row of [realmA, realmB, null]) {
                for (const visible of [true, false]) {
                    contexts.push({
                        name,
                        realmId,
                        data: resource(row, visible),
                    });
                }
            }
        }
    }

    return contexts;
}

async function verdicts(evaluator: IPermissionEvaluator, contexts: PermissionEvaluationContext[]) {
    const output : unknown[] = [];

    for (const ctx of contexts) {
        output.push(await allowed(evaluator, ctx));

        if (!ctx.data) {
            output.push(await allowed(evaluator, ctx, 'preEvaluate'));
            output.push(await evaluator.compile(ctx as PermissionCompileContext));
        }
    }

    return output;
}

describe('authorization snapshot', () => {
    it('answers exactly what the catalog evaluator answers', async () => {
        const contexts = parityContexts();

        for (const input of [
            {
                catalog: parityCatalog,
                grants: parityGrants,
                identity,
            },
            {
                catalog: parityCatalog,
                grants: [],
                identity,
            },
            { catalog: parityCatalog },
        ]) {
            const expected = await verdicts(await createAuthorizationEvaluator(input), contexts);
            const snapshot = await buildAuthorizationSnapshot({ catalog: input.catalog, grants: input.grants });
            const actual = await verdicts(await createAuthorizationSnapshotEvaluator({
                snapshot,
                identity: input.identity,
            }), contexts);

            expect(actual).toEqual(expected);
            expect(expected).toContain(true);
            expect(expected).toContain(false);
        }
    });

    it('evaluates identically after a JSON round trip, every built-in policy type included', async () => {
        const catalog = {
            policies: {
                attributes: { type: 'attributes', query: { visible: { $eq: true } } },
                attributeNames: { type: 'attributeNames', names: ['name', 'visible', 'realmId'] },
                binding: { type: 'permissionBinding' },
                composite: {
                    type: 'composite',
                    decisionStrategy: 'affirmative',
                    children: [fails, { type: 'date', end: '2020-12-31' }],
                },
                date: {
                    type: 'date',
                    start: new Date(2020, 0, 1),
                    end: new Date(2020, 11, 31),
                },
                identity: passes,
                realmMatch: { type: 'realmMatch', attributeName: 'realmId' },
                time: {
                    type: 'time',
                    start: new Date(2020, 0, 1, 9, 0),
                    end: new Date(2020, 0, 1, 17, 0),
                },
            },
            permissions: [
                'attributes',
                'attributeNames',
                'binding',
                'composite',
                'date',
                'identity',
                'realmMatch',
                'time',
            ].map((name) => definition(name, [name])),
        };
        const grants = [grant('binding', 'any')];
        const rows = [
            {
                [BuiltInPolicyType.ATTRIBUTES]: {
                    name: 'x',
                    visible: true,
                    realmId: realmA,
                },
                [BuiltInPolicyType.DATE]: '2020-06-01',
                [BuiltInPolicyType.TIME]: new Date(2020, 5, 1, 12, 0),
            },
            {
                [BuiltInPolicyType.ATTRIBUTES]: {
                    secret: 'x',
                    visible: false,
                    realmId: realmB,
                },
                [BuiltInPolicyType.DATE]: '2021-06-01',
                [BuiltInPolicyType.TIME]: new Date(2020, 5, 1, 20, 0),
            },
        ];
        const contexts = catalog.permissions.flatMap((entry) => rows.map((row) => ({
            name: entry.name,
            data: new PolicyData(row),
        })));
        const outcomes = async (evaluator: IPermissionEvaluator) => {
            const output : boolean[] = [];

            for (const ctx of contexts) {
                output.push(await allowed(evaluator, ctx));
            }

            return output;
        };

        const snapshot = await buildAuthorizationSnapshot({ catalog, grants });
        const stored = JSON.parse(JSON.stringify(snapshot)) as AuthorizationSnapshot;

        expect(stored).toStrictEqual(snapshot);

        const expected = await outcomes(await createAuthorizationEvaluator({
            catalog,
            grants,
            identity,
        }));

        expect(await outcomes(await createAuthorizationSnapshotEvaluator({ snapshot, identity }))).toEqual(expected);
        expect(await outcomes(await createAuthorizationSnapshotEvaluator({ snapshot: stored, identity }))).toEqual(expected);

        // every type both passes and denies on these rows, so the comparison
        // cannot be won by a definition that silently dropped out
        expect(expected).toEqual([
            true,
            false,
            true,
            false,
            true,
            true,
            true,
            false,
            true,
            false,
            true,
            true,
            true,
            false,
            true,
            false,
        ]);
    });

    it('hands a custom evaluator the validator output on the catalog path, and stores a Date as a number', async () => {
        const at = new Date(2000, 0, 1);
        const received : unknown[] = [];
        const options = {
            validators: { ...PolicyDefaultValidators, stamp: new StampPolicyValidator() },
            evaluators: {
                ...PolicyDefaultEvaluators,
                stamp: {
                    async evaluate(value: Record<string, unknown>) {
                        received.push(value.at);

                        return { success: (value.at as Date).getTime() < Date.now() };
                    },
                } satisfies IPolicyEvaluator,
            },
        };
        const catalog = {
            policies: { stamp: { type: 'stamp', at } },
            permissions: [definition('stamped', ['stamp'])],
        };

        const direct = await createAuthorizationEvaluator({ catalog }, options);

        expect(await allowed(direct, { name: 'stamped' })).toBe(true);
        expect(received).toHaveLength(1);
        expect(received[0]).toBeInstanceOf(Date);
        expect((received[0] as Date).getTime()).toBe(at.getTime());

        // the documented limit: the snapshot stores the number, which a
        // validator accepting only a Date refuses, so the definition drops
        const snapshot = await buildAuthorizationSnapshot({ catalog }, options);

        expect(snapshot.definitions[0]!.policies).toStrictEqual([{ type: 'stamp', at: at.getTime() }]);

        received.length = 0;

        const stored = await createAuthorizationSnapshotEvaluator({ snapshot }, options);

        expect(await allowed(stored, { name: 'stamped' })).toBe(false);
        expect(received).toHaveLength(0);
    });

    it('shares no object with the catalog it was built from', async () => {
        const catalog = structuredClone(parityCatalog);
        const snapshot = await buildAuthorizationSnapshot({ catalog, grants: parityGrants });
        const copy = structuredClone(snapshot);

        catalog.policies.visible.query.visible.$eq = false;
        (catalog.policies.default.children as Policy[]).length = 0;
        catalog.permissions[0]!.name = 'renamed';
        catalog.permissions[0]!.decisionStrategy = 'affirmative';

        expect(snapshot).toEqual(copy);

        const evaluator = await createAuthorizationSnapshotEvaluator({ snapshot, identity });

        expect(await allowed(evaluator, { name: 'event_read', data: resource(realmB, true) })).toBe(true);
        expect(await allowed(evaluator, { name: 'event_read', data: resource(realmB, false) })).toBe(false);
    });

    describe('builder', () => {
        it('emits the two layers as plain data, grants always present', async () => {
            const snapshot = await buildAuthorizationSnapshot({
                catalog: {
                    policies: { binding: { type: 'permissionBinding', invert: null } },
                    permissions: [definition('event_read', ['binding']), definition('open', [])],
                },
                grants: [{ name: 'event_read', realm_scope: null }],
            });

            expect(snapshot).toStrictEqual({
                definitions: [
                    {
                        permission: {
                            name: 'event_read',
                            realmId: null,
                            clientId: null,
                        },
                        policies: [{ type: 'permissionBinding' }],
                    },
                    {
                        permission: {
                            name: 'open',
                            realmId: null,
                            clientId: null,
                        },
                    },
                ],
                grants: [
                    {
                        permission: {
                            name: 'event_read',
                            realmId: null,
                            clientId: null,
                        },
                        realmScope: 'own',
                    },
                ],
            });

            const empty = await buildAuthorizationSnapshot({ catalog: { policies: {}, permissions: [] } });

            expect(empty).toStrictEqual({ definitions: [], grants: [] });
        });

        it('reports a grant naming a missing definition or policy stale', async () => {
            const catalog = { policies: { binding: { type: 'permissionBinding' } }, permissions: [definition('event_read', ['binding'])] };

            await expect(buildAuthorizationSnapshot({ catalog, grants: [grant('event_delete', 'any')] }))
                .rejects.toThrow(AuthorizationCatalogStaleError);
            await expect(buildAuthorizationSnapshot({ catalog, grants: [grant('event_read', 'any', ['missing'])] }))
                .rejects.toThrow(AuthorizationCatalogStaleError);
        });

        it('leaves out a tombstoned or unprojectable definition and drops its grants, keeping an unprojectable junction as the marker', async () => {
            const snapshot = await buildAuthorizationSnapshot({
                catalog: {
                    policies: {
                        binding: { type: 'permissionBinding' },
                        future: { type: 'plan109future' },
                    },
                    permissions: [
                        definition('event_read', ['binding']),
                        definition('event_update', null),
                        definition('event_delete', ['future']),
                    ],
                },
                grants: [
                    grant('event_read', 'any'),
                    grant('event_read', 'own', ['future']),
                    grant('event_update', 'any'),
                    grant('event_delete', 'any'),
                ],
            });

            expect(snapshot.definitions.map((entry) => entry.permission.name)).toEqual(['event_read']);
            expect(snapshot.grants).toEqual([
                {
                    permission: {
                        name: 'event_read',
                        realmId: null,
                        clientId: null,
                    },
                    realmScope: 'any',
                },
                {
                    permission: {
                        name: 'event_read',
                        realmId: null,
                        clientId: null,
                    },
                    realmScope: 'own',
                    policies: [{ type: AUTHORIZATION_POLICY_WITHHELD_TYPE }],
                },
            ]);
        });

        it('refuses a duplicate namespace, naming the entry at fault', async () => {
            const issues = await issuesOf(() => buildAuthorizationSnapshot({
                catalog: {
                    policies: {},
                    permissions: [definition('event_read', []), definition('event_read', null)],
                },
            }));

            expect(issues).toEqual([expect.objectContaining({ path: ['catalog', 'permissions', 1] })]);
        });

        it('refuses a malformed catalog or grant list', async () => {
            expect((await issuesOf(() => buildAuthorizationSnapshot({ catalog: { policies: {} } })))[0]!.path)
                .toEqual(['catalog', 'permissions']);
            expect((await issuesOf(() => buildAuthorizationSnapshot({ catalog: { policies: {}, permissions: [definition('event_read', ['missing'])] } })))[0]!.path).toEqual(['catalog', 'permissions', 0, 'policies', 0]);
            expect((await issuesOf(() => buildAuthorizationSnapshot({
                catalog: { policies: {}, permissions: [] },
                grants: [{ realm_scope: 'any' }],
            })))[0]!.path).toEqual(['grants', 0, 'name']);
        });
    });

    describe('evaluator over stored data', () => {
        it('refuses a malformed envelope with the path of the member at fault', async () => {
            const leafPaths = async (input: Record<string, unknown>) => {
                const [group] = await issuesOf(() => createAuthorizationSnapshotEvaluator({ snapshot: input.snapshot, identity }));

                expect(group).toEqual(expect.objectContaining({ type: 'group', path: ['snapshot'] }));

                return (group as IssueGroup).issues.map((issue) => issue.path);
            };

            expect(await leafPaths({ snapshot: 'x' })).toEqual([['snapshot', 'definitions']]);
            expect(await leafPaths({ snapshot: { definitions: [binding('a'), { permission: {} }] } }))
                .toEqual([['snapshot', 'definitions', 1]]);
            expect(await leafPaths({ snapshot: { definitions: [], grants: [{ permission: { name: 'a' }, realmScope: 'everywhere' }] } })).toEqual([['snapshot', 'grants', 0]]);
        });

        it('refuses a realm reach on a definition', async () => {
            const issues = await issuesOf(() => createAuthorizationSnapshotEvaluator({ snapshot: { definitions: [binding('a'), binding('b', undefined, { realmScope: 'any' })] } }));

            expect(issues).toEqual([expect.objectContaining({ path: ['snapshot', 'definitions', 1, 'realmScope'] })]);
        });

        it('drops a definition whose tree does not project', async () => {
            const evaluator = await createAuthorizationSnapshotEvaluator({
                snapshot: {
                    definitions: [
                        binding('a', [{ type: 'plan109future' }]),
                        binding('b', [{ type: 'attributes', query: 'broken' }]),
                        binding('c', [passes]),
                    ],
                },
                identity,
            });

            expect(await allowed(evaluator, { name: 'a' })).toBe(false);
            expect(await allowed(evaluator, { name: 'b' })).toBe(false);
            expect(await allowed(evaluator, { name: 'c' })).toBe(true);
        });

        it('drops a grant with a binding check, an unprojectable tree or no definition', async () => {
            const evaluator = await createAuthorizationSnapshotEvaluator({
                snapshot: {
                    definitions: [binding('a', [{ type: 'permissionBinding' }])],
                    grants: [
                        binding('a', [{ type: 'permissionBinding' }], { realmScope: 'any' }),
                        binding('a', [{ type: 'composite', children: [passes, { type: 'permissionBinding' }] }], { realmScope: 'any' }),
                        binding('a', [{ type: 'plan109future' }], { realmScope: 'any' }),
                        binding('a', undefined, { realmScope: 'own' }),
                        binding('b', undefined, { realmScope: 'any' }),
                    ],
                },
                identity,
            });

            expect(await allowed(evaluator, { name: 'a', data: resource(realmA, true) })).toBe(true);
            expect(await allowed(evaluator, { name: 'a', data: resource(realmB, true) })).toBe(false);
            expect(await allowed(evaluator, { name: 'b', data: resource(realmA, true) })).toBe(false);
        });

        it('evaluates a grant under its definition\'s decision strategy, not its own', async () => {
            const build = (definitionStrategy: 'affirmative' | 'unanimous', grantStrategy: 'affirmative' | 'unanimous') => {
                const permission = {
                    name: 'a',
                    realmId: null,
                    clientId: null,
                };

                return createAuthorizationSnapshotEvaluator({
                    snapshot: {
                        definitions: [{
                            permission: { ...permission, decisionStrategy: definitionStrategy },
                            policies: [{ type: 'permissionBinding' }],
                        }],
                        grants: [{
                            permission: { ...permission, decisionStrategy: grantStrategy },
                            realmScope: 'any',
                            policies: [passes, fails],
                        }],
                    },
                    identity,
                });
            };

            expect(await allowed(await build('affirmative', 'unanimous'), { name: 'a' })).toBe(true);
            expect(await allowed(await build('unanimous', 'affirmative'), { name: 'a' })).toBe(false);
        });

        it('refuses the policy bypass options', async () => {
            const evaluator = await createAuthorizationSnapshotEvaluator({ snapshot: { definitions: [binding('a')] } });

            await expect(evaluator.evaluate({ name: 'a', options: { policiesIncluded: ['x'] } }))
                .rejects.toThrow('The authorization evaluator does not accept policy bypass options.');
            await expect(evaluator.evaluate({ name: 'a', options: { policiesExcluded: ['x'] } }))
                .rejects.toThrow('The authorization evaluator does not accept policy bypass options.');
            await expect(evaluator.preEvaluate({ name: 'a', options: { pendingPolicies: 'permit' } }))
                .rejects.toThrow('The authorization evaluator does not accept policy bypass options.');
        });
    });

    describe('identity', () => {
        it('refuses grants without the identity they belong to', async () => {
            const issues = await issuesOf(() => createAuthorizationSnapshotEvaluator({ snapshot: { definitions: [binding('a')], grants: [binding('a', undefined, { realmScope: 'any' })] } }));

            expect(issues).toEqual([expect.objectContaining({ path: ['identity'] })]);
        });

        it('accepts empty or absent grants without an identity and removes a supplied one', async () => {
            for (const grants of [undefined, []]) {
                const evaluator = await createAuthorizationSnapshotEvaluator({ snapshot: { definitions: [binding('a', [passes])], ...(grants ? { grants } : {}) } });
                const data = new PolicyData();

                data.set(BuiltInPolicyType.IDENTITY, {
                    id: identity.id,
                    type: 'user',
                    realmId: realmA,
                });
                data.setValidated(BuiltInPolicyType.IDENTITY);

                expect(await allowed(evaluator, { name: 'a', data })).toBe(false);
            }
        });

        it('hands an identity a known, empty grant list when the snapshot carries none', async () => {
            // an inverted binding check passes on a known empty list and
            // denies on a missing one, so this tells the two apart
            const snapshot = { definitions: [binding('a', [{ type: 'permissionBinding', invert: true }])] };

            expect(await allowed(await createAuthorizationSnapshotEvaluator({ snapshot, identity }), { name: 'a' })).toBe(true);
            expect(await allowed(await createAuthorizationSnapshotEvaluator({ snapshot }), { name: 'a' })).toBe(false);
        });
    });

    describe('a grant that cannot be evaluated', () => {
        const policies = {
            inverted: { type: 'permissionBinding', invert: true },
            plain: { type: 'permissionBinding' },
            binding: { type: 'permissionBinding' },
            nested: { type: 'composite', children: [passes, { type: 'permissionBinding' }] },
            future: { type: 'plan109future' },
            withheld: { type: AUTHORIZATION_POLICY_WITHHELD_TYPE },
        };
        const junctions = ['binding', 'nested', 'future', 'withheld'];

        async function paths(definitionPolicy: string, grants: ReturnType<typeof grant>[]) {
            const catalog = {
                policies,
                permissions: [definition('d', [definitionPolicy])],
            };
            const snapshot = await buildAuthorizationSnapshot({ catalog, grants });
            const stored = JSON.parse(JSON.stringify(snapshot)) as AuthorizationSnapshot;

            return [
                await createAuthorizationEvaluator({
                    catalog, 
                    grants, 
                    identity, 
                }),
                await createAuthorizationSnapshotEvaluator({ snapshot, identity }),
                await createAuthorizationSnapshotEvaluator({ snapshot: stored, identity }),
            ];
        }

        async function verdictsOf(evaluators: IPermissionEvaluator[]) {
            const output : boolean[] = [];

            for (const evaluator of evaluators) {
                output.push(await allowed(evaluator, { name: 'd', data: resource(realmA, true) }));
                output.push(await allowed(evaluator, { name: 'd' }, 'preEvaluate'));
            }

            return output;
        }

        it.each(junctions)('keeps it as a term an inverted binding check cannot pass over (%s)', async (junction) => {
            expect(await verdictsOf(await paths('inverted', [grant('d', 'any', [junction])])))
                .toEqual([false, false, false, false, false, false]);
        });

        it('lets an inverted binding check pass over no grant at all', async () => {
            expect(await verdictsOf(await paths('inverted', [])))
                .toEqual([true, true, true, true, true, true]);
        });

        it.each(junctions)('denies through a plain binding check unless another grant passes (%s)', async (junction) => {
            expect(await verdictsOf(await paths('plain', [grant('d', 'any', [junction])])))
                .toEqual([false, false, false, false, false, false]);
            expect(await verdictsOf(await paths('plain', [grant('d', 'any', [junction]), grant('d', 'any')])))
                .toEqual([true, true, true, true, true, true]);
        });

        it('stores the grant with the tree it cannot evaluate, or the withheld marker', async () => {
            const snapshot = await buildAuthorizationSnapshot({
                catalog: { policies, permissions: [definition('d', ['plain'])] },
                grants: junctions.map((junction) => grant('d', 'any', [junction])),
            });

            expect(snapshot.grants!.map((entry) => entry.policies)).toEqual([
                [{ type: 'permissionBinding' }],
                [{ type: 'composite', children: [passes, { type: 'permissionBinding' }] }],
                [{ type: AUTHORIZATION_POLICY_WITHHELD_TYPE }],
                [{ type: AUTHORIZATION_POLICY_WITHHELD_TYPE }],
            ]);
        });

        it('never evaluates the withheld marker with a caller-supplied evaluator', async () => {
            const evaluators = {
                ...PolicyDefaultEvaluators,
                [AUTHORIZATION_POLICY_WITHHELD_TYPE]: { evaluate: async () => ({ success: true }) },
            };
            const catalog = { policies, permissions: [definition('d', ['plain'])] };
            const grants = [grant('d', 'any', ['future'])];
            const snapshot = await buildAuthorizationSnapshot({ catalog, grants });

            expect(await allowed(await createAuthorizationEvaluator({
                catalog, 
                grants, 
                identity, 
            }, { evaluators }), { name: 'd' })).toBe(false);
            expect(await allowed(await createAuthorizationSnapshotEvaluator({ snapshot, identity }, { evaluators }), { name: 'd' })).toBe(false);
        });
    });

    describe('flat case', () => {
        const flat = {
            definitions: [
                binding('a', [fails]),
                binding('a', [passes]),
                binding('denied', [fails]),
                binding('denied', [fails]),
                { permission: { name: 'any', decisionStrategy: 'affirmative' as const }, policies: [passes, fails] },
                { permission: { name: 'all', decisionStrategy: 'unanimous' as const }, policies: [passes, fails] },
                binding('free'),
                binding('bound', [{ type: 'permissionBinding' }]),
            ],
        };

        it('ORs the bindings of a name and combines one binding\'s policies under its strategy', async () => {
            const evaluator = await createAuthorizationSnapshotEvaluator({ snapshot: flat, identity });

            expect(await allowed(evaluator, { name: 'a' })).toBe(true);
            expect(await allowed(evaluator, { name: 'denied' })).toBe(false);
            expect(await allowed(evaluator, { name: 'any' })).toBe(true);
            expect(await allowed(evaluator, { name: 'all' })).toBe(false);
            expect(await allowed(evaluator, { name: 'free' })).toBe(true);
            expect(await allowed(evaluator, { name: 'unknown' })).toBe(false);
        });

        it('denies a binding check without and with an identity', async () => {
            const anonymous = await createAuthorizationSnapshotEvaluator({ snapshot: flat });
            const identified = await createAuthorizationSnapshotEvaluator({ snapshot: flat, identity });

            expect(await allowed(anonymous, { name: 'bound' })).toBe(false);
            expect(await allowed(identified, { name: 'bound' })).toBe(false);
            expect(await allowed(anonymous, { name: 'free' })).toBe(true);
        });
    });
});
