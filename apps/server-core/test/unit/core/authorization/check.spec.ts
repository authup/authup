/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type {
    IPermissionEvaluator,
    IdentityPolicyData,
    PermissionEvaluationContext,
    PermissionPolicyBinding,
} from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
    RealmScope,
} from '@authup/access';
import { DecisionStrategy } from '@authup/kit';
import { buildAuthorizationCheck } from '../../../../src/core/authorization/check.ts';
import type { AuthorizationCheckRequest, PermissionPolicies } from '../../../../src/core/authorization/types.ts';
import { FakeAuthorizationCatalogRepository } from '../helpers/fake-authorization-catalog-repository.ts';
import { FakeIdentityPermissionProvider } from '../helpers/fake-identity-permission-provider.ts';

const REALM_ID = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
const FOREIGN_REALM_ID = 'c641912c-21e5-4cb4-84b6-169e2b2bb099';
const CLIENT_ID = 'c641912c-21e5-4cb4-84b6-169e2b2bb025';

const systemDefault = {
    id: 'policy-default',
    name: 'system.default',
    realmId: null,
    builtIn: true,
    type: 'composite',
    decisionStrategy: 'unanimous',
    children: [
        {
            id: 'policy-identity', 
            realmId: null, 
            type: 'identity', 
            builtIn: true, 
        },
        {
            id: 'policy-binding', 
            realmId: null, 
            type: 'permissionBinding', 
            builtIn: true, 
        },
    ],
};

function definition(name: string, overrides: Record<string, any> = {}) : PermissionPolicies {
    return [
        {
            name, 
            realmId: null, 
            clientId: null, 
            ...overrides,
        },
        [systemDefault],
    ];
}

const identity : IdentityPolicyData = {
    type: 'user',
    id: 'c641912c-21e5-4cb4-84b6-169e2b2bb001',
    realmId: REALM_ID,
    realmName: 'tenant',
    clientId: null,
};

/**
 * What `RequestPermissionEvaluator` does for a request, both halves: it places
 * the identity the REQUEST was resolved as, with its grants, and REMOVES the
 * key when the caller's scopes withhold it. The removal is what a spec passing
 * `undefined` models, and modelling only the attach would let this spec pass
 * while the production wrapper answered a scope-restricted bearer as a
 * fully-scoped one.
 */
function decorateWith(value?: IdentityPolicyData) {
    return (evaluator: IPermissionEvaluator) : IPermissionEvaluator => {
        const extend = (ctx: PermissionEvaluationContext) : PermissionEvaluationContext => {
            if (!value) {
                ctx.data?.delete(BuiltInPolicyType.IDENTITY);

                return ctx;
            }

            const data = ctx.data || new PolicyData();
            data.set(BuiltInPolicyType.IDENTITY, value);

            return { ...ctx, data };
        };

        return {
            evaluate: (ctx) => evaluator.evaluate(extend(ctx)),
            evaluateOneOf: (ctx) => evaluator.evaluateOneOf(extend(ctx)),
            preEvaluate: (ctx) => evaluator.preEvaluate(extend(ctx)),
            preEvaluateOneOf: (ctx) => evaluator.preEvaluateOneOf(extend(ctx)),
            compile: (ctx) => evaluator.compile(ctx as any),
        };
    };
}

/**
 * A caller whose scopes let policies see its identity: the controller loads
 * its grants onto it, and the request wrapper places that same identity.
 */
async function visible(
    ctx: ReturnType<typeof setup>,
    value: IdentityPolicyData = identity,
) : Promise<Pick<AuthorizationCheckRequest, 'identity' | 'decorate'>> {
    const withGrants = {
        ...value,
        grants: await ctx.identityPermissionProvider.getFor(value),
    };

    return { identity: withGrants, decorate: decorateWith(withGrants) };
}

function grant(name: string, realmScope: `${RealmScope}`) : PermissionPolicyBinding {
    return {
        permission: {
            name, 
            realmId: null, 
            clientId: null, 
        },
        realmScope,
    };
}

function setup(definitions: PermissionPolicies[], grants: PermissionPolicyBinding[]) {
    const catalogRepository = new FakeAuthorizationCatalogRepository();
    catalogRepository.setDefinitions(definitions);

    const identityPermissionProvider = new FakeIdentityPermissionProvider();
    identityPermissionProvider.setBindings(grants);

    return { catalogRepository, identityPermissionProvider };
}

describe('core/authorization/check', () => {
    it('answers the own realm and the global rows for an ownOrNull grant', async () => {
        const ctx = setup(
            [definition('user_update'), definition('user_read')],
            [grant('user_update', RealmScope.OWN_OR_NULL)],
        );

        const { permissions: result } = await buildAuthorizationCheck(ctx, await visible(ctx));

        expect(result).toEqual([
            { name: 'user_update', realms: [REALM_ID, null] },
        ]);
    });

    // The decorator loads the request's grants itself, inside the matrix. A
    // failure there never reached a verdict either, so it must fail the build
    // rather than be read as a denial of every pair.
    it('raises a decorator failure rather than answering an empty verdict set', async () => {
        const ctx = setup([definition('user_update')], [grant('user_update', RealmScope.OWN_OR_NULL)]);

        const error = new Error('ECONNREFUSED: the database is down');
        const failing : IPermissionEvaluator = {
            evaluate: () => Promise.reject(error),
            evaluateOneOf: () => Promise.reject(error),
            preEvaluate: () => Promise.reject(error),
            preEvaluateOneOf: () => Promise.reject(error),
            compile: () => Promise.reject(error),
        };

        await expect(buildAuthorizationCheck(ctx, {
            identity,
            decorate: () => failing,
        })).rejects.toThrow(error);
    });

    it('answers the own realm alone for an own grant', async () => {
        const ctx = setup([definition('user_update')], [grant('user_update', RealmScope.OWN)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, await visible(ctx));

        expect(result).toEqual([{ name: 'user_update', realms: [REALM_ID] }]);
    });

    it('answers a named foreign realm only for an any grant', async () => {
        const ctx = setup(
            [definition('user_update'), definition('realm_read')],
            [
                grant('user_update', RealmScope.OWN),
                grant('realm_read', RealmScope.ANY),
            ],
        );

        const { permissions: result } = await buildAuthorizationCheck(ctx, {
            ...await visible(ctx),
            realms: [FOREIGN_REALM_ID],
        });

        expect(result).toEqual([{ name: 'realm_read', realms: [FOREIGN_REALM_ID] }]);
    });

    it('omits a permission reaching none of the requested realms', async () => {
        const ctx = setup([definition('user_update')], [grant('user_update', RealmScope.NONE)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, await visible(ctx));

        expect(result).toEqual([]);
    });

    it('omits a requested name with no global definition', async () => {
        const ctx = setup([definition('user_update')], [grant('user_update', RealmScope.OWN)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, {
            ...await visible(ctx),
            names: ['user_update', 'not_a_permission'],
        });

        expect(result).toEqual([{ name: 'user_update', realms: [REALM_ID] }]);
    });

    // The identity reaches the WHOLE tree, not only the permission-binding
    // child: `decorate` sets the key once on the bag the evaluator passes down.
    // This definition is bound to an identity policy ALONE, so it can only pass
    // if that policy received the identity data, and the caller holds no grant
    // at all, which rules out the binding evaluator answering for it.
    it('supplies the identity to a non-binding policy in the tree', async () => {
        const identityOnlyPolicy = {
            id: 'policy-identity-only',
            name: 'only-users',
            realmId: null,
            type: 'identity',
            types: ['user'],
        };

        const identityOnly : PermissionPolicies = [
            {
                name: 'user_read',
                realmId: null,
                clientId: null,
            },
            [identityOnlyPolicy],
        ];

        const ctx = setup([identityOnly], []);

        const { permissions: held } = await buildAuthorizationCheck(ctx, await visible(ctx));
        expect(held).toEqual([{ name: 'user_read', realms: [REALM_ID, null] }]);

        // the same tree denies an identity the policy does not admit, which is
        // the proof the policy is evaluating the data rather than ignoring it
        const clientIdentity : IdentityPolicyData = {
            type: 'client',
            id: 'c641912c-21e5-4cb4-84b6-169e2b2bb002',
            realmId: REALM_ID,
            realmName: 'tenant',
            clientId: 'c641912c-21e5-4cb4-84b6-169e2b2bb002',
        };

        const { permissions: denied } = await buildAuthorizationCheck(ctx, { ...await visible(ctx, clientIdentity) });
        expect(denied).toEqual([]);
    });

    // A definition whose policy layer needs data this pre-gate does not have is
    // reported HELD, and that is the contract rather than a leak: `preEvaluate`
    // permits a PENDING policy, so the answer is the upper bound on what may be
    // ATTEMPTED, and it equals what the caller's own route gate answers for the
    // same name. Verified against the route path: a bare `preEvaluate` of this
    // definition with no identity passes there too, while `evaluate()` (the
    // actual operation, which carries the resource row) denies.
    //
    // The scope case above denies only because `system.default` carries a
    // permissionBinding child, which SETTLES false without an identity rather
    // than pending. A definition bound to an identity policy alone has no such
    // child, so nothing settles and the pre-gate passes on both paths. Asserting
    // `[]` here would make the check stricter than the gate it reports on.
    it('reports a pending definition as held, exactly as the route pre-gate does', async () => {
        const identityOnlyPolicy = {
            id: 'policy-identity-only',
            name: 'only-users',
            realmId: null,
            type: 'identity',
            types: ['user'],
        };

        const ctx = setup([[
            {
                name: 'user_read',
                realmId: null,
                clientId: null,
            },
            [identityOnlyPolicy],
        ]], []);

        const { permissions: held } = await buildAuthorizationCheck(ctx, {
            identity,
            realms: RealmScope.OWN,
            decorate: decorateWith(undefined),
        });

        expect(held).toEqual([{ name: 'user_read', realms: [REALM_ID] }]);
    });

    it('answers nothing for a credential whose scopes withhold the identity', async () => {
        const ctx = setup([definition('user_update')], [grant('user_update', RealmScope.ANY)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, {
            identity,
            decorate: decorateWith(undefined),
        });

        expect(result).toEqual([]);
    });

    it('resolves the own selector to the identity realm alone', async () => {
        const ctx = setup([definition('user_read')], [grant('user_read', RealmScope.OWN_OR_NULL)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, {
            ...await visible(ctx),
            realms: RealmScope.OWN,
        });

        expect(result).toEqual([{ name: 'user_read', realms: [REALM_ID] }]);
    });

    it('echoes an explicit realm list verbatim and deduplicates it', async () => {
        const ctx = setup([definition('user_read')], [grant('user_read', RealmScope.ANY)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, {
            ...await visible(ctx),
            realms: [FOREIGN_REALM_ID, FOREIGN_REALM_ID, null],
        });

        expect(result).toEqual([
            { name: 'user_read', realms: [FOREIGN_REALM_ID, null] },
        ]);
    });

    it('skips a realm- or client-scoped definition, which no gate can resolve either', async () => {
        const ctx = setup(
            [
                definition('user_read'),
                definition('tenant_thing', { realmId: REALM_ID }),
                definition('client_thing', { clientId: CLIENT_ID }),
            ],
            [
                grant('user_read', RealmScope.ANY),
                grant('tenant_thing', RealmScope.ANY),
                grant('client_thing', RealmScope.ANY),
            ],
        );

        const { permissions: result } = await buildAuthorizationCheck(ctx, await visible(ctx));

        expect(result.map((entry) => entry.name)).toEqual(['user_read']);
    });


    it('answers nothing when the identity has no realm to resolve own against', async () => {
        const ctx = setup([definition('user_read')], [grant('user_read', RealmScope.ANY)]);

        const { permissions: result } = await buildAuthorizationCheck(ctx, {
            ...await visible(ctx, {
                ...identity,
                realmId: null,
                realmName: null,
            }),
            realms: RealmScope.OWN,
        });

        expect(result).toEqual([]);
    });

    describe('expiry', () => {
        // Wednesday, 2024-04-17, local time.
        const at = (hours: number) => new Date(2024, 3, 17, hours);

        const officeHours = {
            id: 'policy-office-hours',
            realmId: null,
            builtIn: false,
            type: 'time',
            start: '08:00:00',
            end: '16:00:00',
        };

        afterEach(() => {
            vi.useRealTimers();
        });

        it('reports no expiry when no evaluated verdict depends on the clock', async () => {
            const ctx = setup([definition('user_read')], [grant('user_read', RealmScope.OWN_OR_NULL)]);

            const result = await buildAuthorizationCheck(ctx, await visible(ctx));

            expect(result.permissions).toHaveLength(1);
            expect(result.expiresAt).toBeUndefined();
        });

        it('reports when a time policy opens the window it still denies', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(at(6));

            const ctx = setup(
                [[definition('user_read')[0], [systemDefault, officeHours]]],
                [grant('user_read', RealmScope.OWN_OR_NULL)],
            );

            const result = await buildAuthorizationCheck(ctx, await visible(ctx));

            expect(result.permissions).toEqual([]);
            expect(result.expiresAt).toEqual(at(8));
        });

        it('reports when a time policy closes the window it holds in', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(at(12));

            const ctx = setup(
                [[definition('user_read')[0], [systemDefault, officeHours]]],
                [grant('user_read', RealmScope.OWN_OR_NULL)],
            );

            const result = await buildAuthorizationCheck(ctx, await visible(ctx));

            expect(result.permissions).toEqual([{ name: 'user_read', realms: [REALM_ID, null] }]);
            // the minute after the end: the evaluator compares at minute precision
            expect(result.expiresAt).toEqual(new Date(2024, 3, 17, 16, 1));
        });

        // The window of a permission the caller cannot hold is none of its
        // business: it would disclose the boundaries and have the caller
        // refetch at them for nothing. Junction rows carry no order, so both
        // orders of the definition's policies must answer the same.
        it.each([
            ['the time policy first', () => [officeHours, systemDefault]],
            ['the time policy last', () => [systemDefault, officeHours]],
        ])('reports no expiry to an anonymous caller for a grant-bound definition, %s', async (_, policies) => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(at(6));

            const ctx = setup([[definition('user_read')[0], policies()]], []);

            const result = await buildAuthorizationCheck(ctx, {
                realms: [null],
                decorate: decorateWith(undefined),
            });

            expect(result.permissions).toEqual([]);
            expect(result.expiresAt).toBeUndefined();
        });

        it('reports no expiry to an identity holding no grant for a grant-bound definition', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(at(6));

            const ctx = setup(
                [[definition('user_read')[0], [officeHours, systemDefault]]],
                [grant('user_update', RealmScope.OWN_OR_NULL)],
            );

            const result = await buildAuthorizationCheck(ctx, await visible(ctx));

            expect(result.permissions).toEqual([]);
            expect(result.expiresAt).toBeUndefined();
        });

        // An AFFIRMATIVE definition (a plain form field) passes on the time
        // policy alone, so a grant-less caller's denial moves with the clock.
        it('reports the expiry of an AFFIRMATIVE definition to an identity holding no grant', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(at(6));

            const ctx = setup(
                [[definition('user_read', { decisionStrategy: DecisionStrategy.AFFIRMATIVE })[0], [systemDefault, officeHours]]],
                [],
            );

            const result = await buildAuthorizationCheck(ctx, await visible(ctx));

            expect(result.permissions).toEqual([]);
            expect(result.expiresAt).toEqual(at(8));
        });

        it('reports the expiry of an identity-free definition to an anonymous caller', async () => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(at(6));

            const ctx = setup([[definition('office_open')[0], [officeHours]]], []);

            const result = await buildAuthorizationCheck(ctx, {
                realms: [null],
                decorate: decorateWith(undefined),
            });

            expect(result.permissions).toEqual([]);
            expect(result.expiresAt).toEqual(at(8));
        });
    });
});
