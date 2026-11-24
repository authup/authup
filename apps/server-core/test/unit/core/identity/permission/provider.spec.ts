/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IPermissionEvaluator,
    IdentityPolicyData,
    PermissionPolicyBinding,
    PolicyData,
} from '@authup/access';
import {
    BuiltInPolicyType,
    PermissionError,
    RealmScope,
    reachesRecord,
    realmScopeMatches,
} from '@authup/access';
import { randomUUID } from 'node:crypto';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import { PermissionName } from '@authup/core-kit';
import {
    describe,
    expect,
    expectTypeOf,
    it,
} from 'vitest';
import { IdentityPermissionProvider } from '../../../../../src/core/identity/permission/module.ts';
import type { IIdentityPermissionProvider, SupersetActor } from '../../../../../src/core/identity/permission/types.ts';
import { IdentityRoleProvider } from '../../../../../src/core/identity/role/module.ts';
import type { ClientMatchActorGrant } from '../../helpers/index.ts';
import { createClientMatchActor, toNarrowable } from '../../helpers/index.ts';

/**
 * Direct coverage of the REAL disjunction-aware isSuperset + resolveJunctionGrant
 * (the service specs use a fake provider that substitutes this logic). Uses `role`
 * identities so only roleRepository.getBoundPermissions is exercised.
 */
function createProvider(bindingsById: Record<string, PermissionPolicyBinding[]>) {
    const roleRepository = {
        getBoundPermissions: async (id: string) => bindingsById[id] ?? [],
        getBoundPermissionsForMany: async () => [],
    };

    return new IdentityPermissionProvider({
        roleRepository: roleRepository as any,
        clientRepository: {} as any,
        userRepository: {} as any,
        roleProvider: { getRolesFor: async () => [] } as any,
    });
}

/**
 * A gate that does not tell grants apart answers the same for every grant
 * the provider narrows it to.
 */
function toActor(gate: IPermissionEvaluator | SupersetActor): SupersetActor {
    if ('permissionEvaluator' in gate) {
        return gate;
    }

    return { permissionEvaluator: toNarrowable(gate, () => gate) };
}

async function isRoleSuperset(
    provider: IdentityPermissionProvider,
    gate: IPermissionEvaluator | SupersetActor = new FakePermissionEvaluator(),
) {
    return provider.isSuperset(
        await provider.getFor({ type: 'role', id: 'parent' }),
        await provider.getFor({ type: 'role', id: 'child' }),
        toActor(gate),
    );
}

/**
 * Stands in for the request evaluator's `permission_update` gate: the
 * actor's grant reaches the record's realm (what `system.default` decides),
 * and the permission's own policies pass unless `refuse` says otherwise.
 */
function createGate(actorRealmId: string, reach: `${RealmScope}`, refuse = false) {
    return new FakePermissionEvaluator(({ method, ctx }) => {
        if (method !== 'evaluate') {
            return;
        }

        const realm = (ctx.data as PolicyData).get(BuiltInPolicyType.REALM_MATCH) as string | null;

        if (refuse || !realmScopeMatches(reach, realm, actorRealmId)) {
            throw PermissionError.denied(String(ctx.name));
        }
    });
}

const policy = { id: 'policy-1', type: BuiltInPolicyType.IDENTITY } as any;
const policyOther = { id: 'policy-2', type: BuiltInPolicyType.ATTRIBUTES } as any;

describe('core/identity/permission — IdentityPermissionProvider disjunction (#3155)', () => {
    it('accepts only the identity type and id for permission lookup', () => {
        expectTypeOf<Parameters<IIdentityPermissionProvider['getFor']>[0]>()
            .toEqualTypeOf<{ type: string; id: string }>();
        expectTypeOf<Parameters<IdentityPermissionProvider['getFor']>[0]>()
            .toEqualTypeOf<{ type: string; id: string }>();
    });

    it('resolves every permission a client-owned role carries (#3607)', async () => {
        const provider = createProvider({
            child: [
                { permission: { name: 'user_delete', clientId: null } },
                { permission: { name: 'client_x', clientId: 'x' } },
                { permission: { name: 'client_y', clientId: 'y' } },
            ],
        });

        const identity: IdentityPolicyData = {
            type: 'role',
            id: 'child',
            clientId: 'x',
        };
        const bindings = await provider.getFor(identity);

        expect(bindings.map((binding) => binding.permission.name)).toEqual([
            'user_delete',
            'client_x',
            'client_y',
        ]);
    });

    describe('isSuperset', () => {
        it('blocks a mixed-grant actor (own no-policy + any policy) from assigning an unconditional any role', async () => {
            const provider = createProvider({
                parent: [
                    { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
                    {
                        permission: { name: 'user_read' },
                        policies: [policy],
                        realmScope: RealmScope.ANY,
                    },
                ],
                child: [
                    { permission: { name: 'user_read' }, realmScope: RealmScope.ANY },
                ],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(false);
        });

        it('allows a mixed-grant actor to assign an own no-policy role', async () => {
            const provider = createProvider({
                parent: [
                    { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
                    {
                        permission: { name: 'user_read' },
                        policies: [policy],
                        realmScope: RealmScope.ANY,
                    },
                ],
                child: [
                    { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
                ],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(true);
        });

        it('blocks an own-scoped actor from assigning an any-scoped role (insufficient reach)', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_read' }, realmScope: RealmScope.OWN }],
                child: [{ permission: { name: 'user_read' }, realmScope: RealmScope.ANY }],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(false);
        });

        it('blocks when the actor is missing a permission the role holds', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_read' } }],
                child: [{ permission: { name: 'user_read' } }, { permission: { name: 'user_write' } }],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(false);
        });

        // #3159: policy content is compared — a differently-CONFIGURED policy must not dominate.
        it('blocks an actor restricted by one policy from assigning a role restricted by another', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_update' }, policies: [policy] }],
                child: [{ permission: { name: 'user_update' }, policies: [policyOther] }],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(false);
        });

        it('allows assigning a role restricted by the SAME policy the actor holds', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_update' }, policies: [policy] }],
                child: [{ permission: { name: 'user_update' }, policies: [policy] }],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(true);
        });

        it('allows assigning a role restricted by a distinct policy row with identical config', async () => {
            // Different persisted id, same configuration => same predicate => the actor holds it.
            const provider = createProvider({
                parent: [{
                    permission: { name: 'user_update' },
                    policies: [{
                        id: 'row-1',
                        type: BuiltInPolicyType.IDENTITY,
                        types: ['user'],
                    } as any],
                }],
                child: [{
                    permission: { name: 'user_update' },
                    policies: [{
                        id: 'row-2',
                        type: BuiltInPolicyType.IDENTITY,
                        types: ['user'],
                    } as any],
                }],
            });

            const result = await isRoleSuperset(provider);

            expect(result).toBe(true);
        });
    });

    // #3855: an actor managing the permission definitions of a realm may hand out
    // that realm's own (realm- or client-owned) permissions through a role.
    describe('isSuperset over realm- and client-owned permissions (#3855)', () => {
        const realmA = 'realm-a';
        const realmB = 'realm-b';
        const manager = (realmScope: `${RealmScope}`, policies?: PermissionPolicyBinding['policies']) : PermissionPolicyBinding => ({
            permission: {
                name: PermissionName.PERMISSION_UPDATE,
                realmId: null,
                clientId: null,
            },
            realmScope,
            ...(policies ? { policies } : {}),
        });
        const ownedBy = (
            realmId: string,
            clientOwnedReach: `${RealmScope}` = RealmScope.ANY,
        ) : PermissionPolicyBinding[] => [
            {
                permission: {
                    name: 'p1',
                    realmId,
                    clientId: null,
                },
            },
            {
                permission: {
                    name: 'p2',
                    realmId,
                    clientId: 'client-1',
                },
                realmScope: clientOwnedReach,
            },
        ];

        it('lets an actor managing every realm assign a role over realm- and client-owned permissions', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.ANY)],
                child: ownedBy(realmB),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.ANY))).resolves.toBe(true);
        });

        it('runs the permission_update gate on each owned permission row', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.ANY)],
                child: ownedBy(realmB),
            });
            const gate = createGate(realmA, RealmScope.ANY);

            await isRoleSuperset(provider, gate);

            expect(gate.evaluateCalls).toHaveLength(2);

            for (const call of gate.evaluateCalls) {
                const data = call.data as PolicyData;

                expect(call.name).toEqual(PermissionName.PERMISSION_UPDATE);
                expect(data.get(BuiltInPolicyType.REALM_MATCH)).toEqual(realmB);
                expect(data.get(BuiltInPolicyType.ATTRIBUTES)).toMatchObject({ realmId: realmB });
            }
        });

        it('lets an actor managing its own realm assign a role over that realm\'s permissions', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.OWN)],
                child: ownedBy(realmA, RealmScope.OWN),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.OWN))).resolves.toBe(true);
        });

        it('refuses an actor managing its own realm a role granting wider reach than its own', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.OWN)],
                child: ownedBy(realmA, RealmScope.ANY),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.OWN))).resolves.toBe(false);
        });

        it('refuses an actor managing its own realm a role over another realm\'s permissions', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.OWN)],
                child: ownedBy(realmB, RealmScope.OWN),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.OWN))).resolves.toBe(false);
        });

        it('refuses an actor whose permission_update the permission\'s own policies deny', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.ANY)],
                child: ownedBy(realmA),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.ANY, true))).resolves.toBe(false);
        });

        it('refuses an actor managing permissions only under a policy', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.ANY, [policy])],
                child: ownedBy(realmA),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.ANY))).resolves.toBe(false);
        });

        it('refuses an actor that does not manage permissions', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: PermissionName.USER_ROLE_CREATE }, realmScope: RealmScope.ANY }],
                child: ownedBy(realmA),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.ANY))).resolves.toBe(false);
        });

        it('does not count a realm-owned permission named like the management permission', async () => {
            const provider = createProvider({
                parent: [{
                    permission: {
                        name: PermissionName.PERMISSION_UPDATE,
                        realmId: realmA,
                        clientId: null,
                    },
                    realmScope: RealmScope.ANY,
                }],
                child: ownedBy(realmA),
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.ANY))).resolves.toBe(false);
        });

        it('keeps strict dominance for a global permission', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.ANY)],
                child: [{
                    permission: {
                        name: 'user_read',
                        realmId: null,
                        clientId: null,
                    },
                }],
            });

            await expect(isRoleSuperset(provider, createGate(realmA, RealmScope.ANY))).resolves.toBe(false);
        });

        it('propagates a gate failure that is not a permission error', async () => {
            const provider = createProvider({
                parent: [manager(RealmScope.ANY)],
                child: ownedBy(realmA),
            });
            const gate = new FakePermissionEvaluator(() => {
                throw new Error('database down');
            });

            await expect(isRoleSuperset(provider, gate)).rejects.toThrow('database down');
        });
    });

    // A manager grant bound to exactly one clientMatch policy manages the
    // permissions its client owns, and so may delegate them (#3907).
    describe('clientMatch-bound managers (#3907)', () => {
        const realmId = randomUUID();
        const clientId = randomUUID();
        const otherClientId = randomUUID();

        const manager = (policy?: Record<string, any>) : PermissionPolicyBinding => ({
            permission: {
                name: PermissionName.PERMISSION_UPDATE,
                realmId: null,
                clientId: null,
            },
            realmScope: RealmScope.OWN,
            ...(policy ? { policies: [policy as any] } : {}),
        });
        const owned = (owner: string) : PermissionPolicyBinding => ({
            permission: {
                name: 'p2',
                realmId,
                clientId: owner,
            },
            realmScope: RealmScope.OWN,
        });
        const createActor = () => createClientMatchActor({
            clientId,
            realmId,
            names: [PermissionName.PERMISSION_UPDATE],
        });

        it('covers a role holding a permission the actor client owns', async () => {
            const provider = createProvider({
                parent: [manager({ type: BuiltInPolicyType.CLIENT_MATCH })],
                child: [owned(clientId)],
            });
            const actor = await createActor();

            await expect(isRoleSuperset(provider, actor)).resolves.toBe(true);
        });

        it('does not cover a permission another client owns', async () => {
            const provider = createProvider({
                parent: [manager({ type: BuiltInPolicyType.CLIENT_MATCH })],
                child: [owned(otherClientId)],
            });
            const actor = await createActor();

            await expect(isRoleSuperset(provider, actor)).resolves.toBe(false);
        });

        it('does not count an attributes-bound manager grant', async () => {
            const provider = createProvider({
                parent: [manager({ type: BuiltInPolicyType.ATTRIBUTES, query: { realmId } })],
                child: [owned(clientId)],
            });

            await expect(isRoleSuperset(provider, new FakePermissionEvaluator())).resolves.toBe(false);
        });

        it('does not count an inverted clientMatch manager grant', async () => {
            const provider = createProvider({
                parent: [manager({ type: BuiltInPolicyType.CLIENT_MATCH, invert: true })],
                child: [owned(clientId)],
            });

            await expect(isRoleSuperset(provider, new FakePermissionEvaluator())).resolves.toBe(false);
        });

        it('does not count a composite policy containing clientMatch', async () => {
            const provider = createProvider({
                parent: [manager({
                    type: BuiltInPolicyType.COMPOSITE,
                    children: [{ type: BuiltInPolicyType.CLIENT_MATCH }],
                })],
                child: [owned(clientId)],
            });

            await expect(isRoleSuperset(provider, new FakePermissionEvaluator())).resolves.toBe(false);
        });

        describe('resolveManagerGrant', () => {
            const provider = createProvider({});
            const permission = (owner: string | null, realm: string | null = realmId) => ({
                name: 'p2',
                realmId: realm,
                clientId: owner,
            });

            it('answers the manager reach for an owned permission', async () => {
                const actor = await createActor();

                await expect(provider.resolveManagerGrant(
                    [manager({ type: BuiltInPolicyType.CLIENT_MATCH })],
                    permission(clientId),
                    actor,
                )).resolves.toEqual({ realmScope: RealmScope.OWN });
            });

            // Mixed grants on the real engine: each manager grant is gated on
            // its own, so a reach comes only from a grant that reaches the row.
            const createMixedActor = (grants: ClientMatchActorGrant[]) => createClientMatchActor({
                clientId,
                realmId,
                names: [],
                grants,
            });
            const policyFreeOwnAndClientMatchAny = () => createMixedActor([
                { name: PermissionName.PERMISSION_UPDATE, realmScope: RealmScope.OWN },
                {
                    name: PermissionName.PERMISSION_UPDATE,
                    realmScope: RealmScope.ANY,
                    policy: { type: BuiltInPolicyType.CLIENT_MATCH },
                },
            ]);

            it('answers the widest reach among the manager grants reaching the row', async () => {
                const actor = await policyFreeOwnAndClientMatchAny();

                await expect(provider.resolveManagerGrant(await actor.grants!(), permission(clientId), actor))
                    .resolves.toEqual({ realmScope: RealmScope.ANY });
            });

            it('answers only the reach of the policy-free grant on a row another client owns', async () => {
                const actor = await policyFreeOwnAndClientMatchAny();

                await expect(provider.resolveManagerGrant(await actor.grants!(), permission(otherClientId), actor))
                    .resolves.toEqual({ realmScope: RealmScope.OWN });
            });

            it('answers null when no manager grant reaches the row', async () => {
                const actor = await policyFreeOwnAndClientMatchAny();

                await expect(provider.resolveManagerGrant(
                    await actor.grants!(),
                    permission(otherClientId, randomUUID()),
                    actor,
                )).resolves.toBeNull();
            });

            it('does not let an excluded grant passing the gate vouch for a manager grant', async () => {
                const actor = await createMixedActor([
                    {
                        name: PermissionName.PERMISSION_UPDATE,
                        realmScope: RealmScope.ANY,
                        policy: { type: BuiltInPolicyType.ATTRIBUTES, query: { name: 'p2' } },
                    },
                    {
                        name: PermissionName.PERMISSION_UPDATE,
                        realmScope: RealmScope.OWN,
                        policy: { type: BuiltInPolicyType.CLIENT_MATCH },
                    },
                ]);

                // the attributes-bound grant alone passes the gate on that row
                await expect(reachesRecord(actor.permissionEvaluator, {
                    name: PermissionName.PERMISSION_UPDATE,
                    realm: realmId,
                    owner: otherClientId,
                    data: { [BuiltInPolicyType.ATTRIBUTES]: permission(otherClientId) },
                })).resolves.toBe(true);

                await expect(provider.resolveManagerGrant(await actor.grants!(), permission(otherClientId), actor))
                    .resolves.toBeNull();

                const superset = createProvider({
                    parent: await actor.grants!(),
                    child: [owned(otherClientId)],
                });

                await expect(isRoleSuperset(superset, actor)).resolves.toBe(false);
            });

            it('covers a role only up to the reach of the grant reaching its row', async () => {
                const actor = await policyFreeOwnAndClientMatchAny();
                const parent = await actor.grants!();

                await expect(isRoleSuperset(createProvider({
                    parent,
                    child: [owned(otherClientId)],
                }), actor)).resolves.toBe(true);
                await expect(isRoleSuperset(createProvider({
                    parent,
                    child: [{ ...owned(otherClientId), realmScope: RealmScope.ANY }],
                }), actor)).resolves.toBe(false);
                await expect(isRoleSuperset(createProvider({
                    parent,
                    child: [{ ...owned(clientId), realmScope: RealmScope.ANY }],
                }), actor)).resolves.toBe(true);
            });

            it('answers null for an actor that cannot narrow its grants', async () => {
                await expect(provider.resolveManagerGrant(
                    [manager()],
                    permission(clientId),
                    { permissionEvaluator: new FakePermissionEvaluator() },
                )).resolves.toBeNull();
            });

            it('passes the owner and realm to the permission_update gate', async () => {
                const gate = new FakePermissionEvaluator();

                await provider.resolveManagerGrant(
                    [manager({ type: BuiltInPolicyType.CLIENT_MATCH })],
                    permission(clientId),
                    toActor(gate),
                );

                expect(gate.evaluateCalls).toHaveLength(1);

                const data = gate.evaluateCalls[0]!.data as PolicyData;

                expect(gate.evaluateCalls[0]!.name).toEqual(PermissionName.PERMISSION_UPDATE);
                expect(data.get(BuiltInPolicyType.CLIENT_MATCH)).toEqual(clientId);
                expect(data.get(BuiltInPolicyType.REALM_MATCH)).toEqual(realmId);
            });

            it('answers null for a permission another client owns', async () => {
                const actor = await createActor();

                await expect(provider.resolveManagerGrant(
                    [manager({ type: BuiltInPolicyType.CLIENT_MATCH })],
                    permission(otherClientId),
                    actor,
                )).resolves.toBeNull();
            });

            it('answers null for a global permission', async () => {
                await expect(provider.resolveManagerGrant(
                    [manager()],
                    permission(null, null),
                    toActor(new FakePermissionEvaluator()),
                )).resolves.toBeNull();
            });

            it('answers null without a manager grant', async () => {
                await expect(provider.resolveManagerGrant(
                    [manager({ type: BuiltInPolicyType.ATTRIBUTES, query: { realmId } })],
                    permission(clientId),
                    toActor(new FakePermissionEvaluator()),
                )).resolves.toBeNull();
            });
        });
    });

    describe('resolveJunctionGrant (#3160 — selection is relative to the requested reach)', () => {
        // The actor holds BOTH (own, no-policy) and (any, IDENTITY-policy) for one permission.
        const mixedActor = () => createProvider({
            actor: [
                { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
                {
                    permission: { name: 'user_read' },
                    policies: [policy],
                    realmScope: RealmScope.ANY,
                },
            ],
        });

        it('selects the policy-free own grant for an own request (no spurious policy inheritance)', async () => {
            // The actor genuinely holds (own, no-policy), so an own-scoped junction must stay
            // ungated — it must NOT inherit the wider (any, policy) grant's policy (the #3160 bug).
            const result = await mixedActor().resolveJunctionGrant(
                await mixedActor().getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.OWN },
            );

            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });

        it('selects the wider policy-bound grant when the request needs its reach', async () => {
            // Reaching `any` is only possible via the (any, policy) grant, so its policy rides along.
            const result = await mixedActor().resolveJunctionGrant(
                await mixedActor().getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.ANY },
            );

            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policy?.id).toBe('policy-1');
        });

        it('defaults the request to own when no realmScope option is given', async () => {
            const result = await mixedActor().resolveJunctionGrant(
                await mixedActor().getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read' },
            );

            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });

        it('prefers a policy-free grant on a capped-scope tie (admin stays unrestricted)', async () => {
            const provider = createProvider({
                actor: [
                    {
                        permission: { name: 'user_read' },
                        policies: [policy],
                        realmScope: RealmScope.ANY,
                    },
                    { permission: { name: 'user_read' }, realmScope: RealmScope.ANY },
                ],
            });

            const result = await provider.resolveJunctionGrant(
                await provider.getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.ANY },
            );

            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policy).toBeUndefined();
        });

        it('defaults to own when the actor holds no matching grant', async () => {
            const provider = createProvider({ actor: [] });

            const result = await provider.resolveJunctionGrant(await provider.getFor({ type: 'role', id: 'actor' }), { name: 'user_read' });

            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });

        it('fails closed (none) when the only grant covering the request has a non-propagatable policy', async () => {
            // Two policies => buildGrant wraps them in a composite (no id) => not isPolicy.
            // The grant is policy-RESTRICTED, so it must NOT degrade to an unrestricted grant.
            const provider = createProvider({
                actor: [
                    {
                        permission: { name: 'user_read' },
                        policies: [policy, { type: BuiltInPolicyType.REALM_MATCH } as any],
                        realmScope: RealmScope.ANY,
                    },
                ],
            });

            const result = await provider.resolveJunctionGrant(
                await provider.getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.ANY },
            );

            expect(result.realmScope).toBe(RealmScope.NONE);
            expect(result.policy).toBeUndefined();
        });

        it('selects deterministically between two policy-bound grants regardless of order', async () => {
            // Two equally-reaching policy-bound grants: the total ordering breaks the tie by policy
            // id (policy-1 < policy-2), so the selection is identical no matter the binding order.
            const forward = createProvider({
                actor: [
                    {
                        permission: { name: 'user_read' },
                        policies: [policy],
                        realmScope: RealmScope.ANY,
                    },
                    {
                        permission: { name: 'user_read' },
                        policies: [policyOther],
                        realmScope: RealmScope.ANY,
                    },
                ],
            });
            const reverse = createProvider({
                actor: [
                    {
                        permission: { name: 'user_read' },
                        policies: [policyOther],
                        realmScope: RealmScope.ANY,
                    },
                    {
                        permission: { name: 'user_read' },
                        policies: [policy],
                        realmScope: RealmScope.ANY,
                    },
                ],
            });

            const a = await forward.resolveJunctionGrant(
                await forward.getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.ANY },
            );
            const b = await reverse.resolveJunctionGrant(
                await reverse.getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.ANY },
            );

            expect(a.policy?.id).toBe('policy-1');
            expect(b.policy?.id).toBe('policy-1');
        });

        it('avoids the non-propagatable composite by selecting a clean own grant for an own request', async () => {
            // #3160: a clean own grant lets an own request succeed even when a wider grant carries
            // a non-propagatable composite policy (the old global-ceiling collapse failed closed here).
            const provider = createProvider({
                actor: [
                    { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
                    {
                        permission: { name: 'user_read' },
                        policies: [policy, { type: BuiltInPolicyType.REALM_MATCH } as any],
                        realmScope: RealmScope.ANY,
                    },
                ],
            });

            const result = await provider.resolveJunctionGrant(
                await provider.getFor({ type: 'role', id: 'actor' }),
                { name: 'user_read', realmScope: RealmScope.OWN },
            );

            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });
    });
});

describe('core/identity/permission — the grants a token carries (#3597)', () => {
    const X = '9a3b1ee1-7c4f-4e33-8d1e-2f7b1a6c0001';
    const Z = '9a3b1ee1-7c4f-4e33-8d1e-2f7b1a6c0002';

    // A user holding a global permission, one owned by X and one owned by Z
    // directly; a GLOBAL role carrying the same spread; a role owned by Z
    // carrying a global permission.
    function createUserProvider(childBindings: PermissionPolicyBinding[] = []) {
        const roleBindings: Record<string, PermissionPolicyBinding[]> = {
            'r-global': [
                { permission: { name: 'q', clientId: null } },
                { permission: { name: 'q_x', clientId: X } },
                { permission: { name: 'q_z', clientId: Z } },
            ],
            'r-z': [{ permission: { name: 'r', clientId: null }, realmScope: RealmScope.ANY }],
        };

        const userRepository = {
            getBoundPermissions: async () => [
                { permission: { name: 'g', clientId: null } },
                { permission: { name: 'p_x', clientId: X } },
                { permission: { name: 'p_z', clientId: Z } },
            ],
            getBoundRoles: async () => [
                { id: 'r-global', clientId: null },
                { id: 'r-z', clientId: Z },
            ],
        };

        return new IdentityPermissionProvider({
            userRepository: userRepository as any,
            clientRepository: {} as any,
            roleRepository: {
                getBoundPermissions: async () => childBindings,
                getBoundPermissionsForMany: async (roles: { id: string }[]) => roles.flatMap((role) => roleBindings[role.id] ?? []),
            } as any,
            roleProvider: new IdentityRoleProvider({
                userRepository: userRepository as any,
                clientRepository: {} as any,
            }),
        });
    }

    const names = (bindings: PermissionPolicyBinding[]) => bindings.map((b) => b.permission.name).sort();

    it('loads all assignments even when the identity object carries client metadata', async () => {
        const identity: IdentityPolicyData = {
            type: 'user',
            id: 'u',
            clientId: X,
        };

        const result = await createUserProvider().getFor(identity);

        expect(names(result)).toEqual(['g', 'p_x', 'p_z', 'q', 'q_x', 'q_z', 'r']);
    });

    it('keeps unowned grants plus the token client\'s, direct and role-derived', async () => {
        const result = await createUserProvider().getForToken({
            sub: 'u',
            sub_kind: 'user',
            client_id: X,
        });

        // `g` and `q` surviving pins the equality regression: a client on the
        // token must never drop the global catalogue.
        expect(names(result)).toEqual(['g', 'p_x', 'q', 'q_x']);
    });

    it('keeps a role owned by the token client, with the global permissions it carries', async () => {
        const result = await createUserProvider().getForToken({
            sub: 'u',
            sub_kind: 'user',
            client_id: Z,
        });

        expect(names(result)).toEqual(['g', 'p_z', 'q', 'q_z', 'r']);
    });

    it('narrows nothing for a token issued to no client', async () => {
        const provider = createUserProvider();

        expect(names(await provider.getForToken({ sub: 'u', sub_kind: 'user' })))
            .toEqual(names(await provider.getFor({ type: 'user', id: 'u' })));
    });

    it('resolves a client subject as itself, whatever client_id it carries', async () => {
        const clientBindings = [
            { permission: { name: 'c', clientId: null } },
            { permission: { name: 'c_z', clientId: Z } },
        ];
        const provider = new IdentityPermissionProvider({
            userRepository: {} as any,
            clientRepository: { getBoundPermissions: async () => clientBindings } as any,
            roleRepository: { getBoundPermissionsForMany: async () => [] } as any,
            roleProvider: { getRolesFor: async () => [] } as any,
        });

        const result = await provider.getForToken({
            sub: 'c1',
            sub_kind: 'client',
            client_id: X,
        });

        expect(names(result)).toEqual(['c', 'c_z']);
    });

    it('resolves nothing for a token naming no subject', async () => {
        await expect(createUserProvider().getForToken({ client_id: X })).resolves.toEqual([]);
    });

    it('lets a delegation check see only what the token carries', async () => {
        // The child role carries `r`, which the user holds only through the Z-owned role.
        const provider = createUserProvider([{ permission: { name: 'r', clientId: null } }]);
        const child = { type: 'role', id: 'child' };

        await expect(provider.isSuperset(await provider.getForToken({
            sub: 'u',
            sub_kind: 'user',
            client_id: X,
        }), await provider.getFor(child), toActor(new FakePermissionEvaluator())))
            .resolves.toBe(false);
        await expect(provider.isSuperset(await provider.getForToken({
            sub: 'u',
            sub_kind: 'user',
            client_id: Z,
        }), await provider.getFor(child), toActor(new FakePermissionEvaluator())))
            .resolves.toBe(true);
    });
});
