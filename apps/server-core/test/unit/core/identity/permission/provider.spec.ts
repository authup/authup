/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '@authup/access';
import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { describe, expect, it } from 'vitest';
import { IdentityPermissionProvider } from '../../../../../src/core/identity/permission/module.ts';

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

const policy = { id: 'policy-1', type: BuiltInPolicyType.IDENTITY } as any;
const policyOther = { id: 'policy-2', type: BuiltInPolicyType.ATTRIBUTES } as any;

describe('core/identity/permission — IdentityPermissionProvider disjunction (#3155)', () => {
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

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
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

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(true);
        });

        it('blocks an own-scoped actor from assigning an any-scoped role (insufficient reach)', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_read' }, realmScope: RealmScope.OWN }],
                child: [{ permission: { name: 'user_read' }, realmScope: RealmScope.ANY }],
            });

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(false);
        });

        it('blocks when the actor is missing a permission the role holds', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_read' } }],
                child: [{ permission: { name: 'user_read' } }, { permission: { name: 'user_write' } }],
            });

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(false);
        });

        // #3159: policy content is compared — a differently-CONFIGURED policy must not dominate.
        it('blocks an actor restricted by one policy from assigning a role restricted by another', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_update' }, policies: [policy] }],
                child: [{ permission: { name: 'user_update' }, policies: [policyOther] }],
            });

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(false);
        });

        it('allows assigning a role restricted by the SAME policy the actor holds', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_update' }, policies: [policy] }],
                child: [{ permission: { name: 'user_update' }, policies: [policy] }],
            });

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
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

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(true);
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
                { type: 'role', id: 'actor' },
                { name: 'user_read', realmScope: RealmScope.OWN },
            );
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });

        it('selects the wider policy-bound grant when the request needs its reach', async () => {
            // Reaching `any` is only possible via the (any, policy) grant, so its policy rides along.
            const result = await mixedActor().resolveJunctionGrant(
                { type: 'role', id: 'actor' },
                { name: 'user_read', realmScope: RealmScope.ANY },
            );
            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policy?.id).toBe('policy-1');
        });

        it('defaults the request to own when no realmScope option is given', async () => {
            const result = await mixedActor().resolveJunctionGrant(
                { type: 'role', id: 'actor' },
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
                { type: 'role', id: 'actor' },
                { name: 'user_read', realmScope: RealmScope.ANY },
            );
            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policy).toBeUndefined();
        });

        it('defaults to own when the actor holds no matching grant', async () => {
            const provider = createProvider({ actor: [] });

            const result = await provider.resolveJunctionGrant({ type: 'role', id: 'actor' }, { name: 'user_read' });
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
                { type: 'role', id: 'actor' },
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
                { type: 'role', id: 'actor' },
                { name: 'user_read', realmScope: RealmScope.ANY },
            );
            const b = await reverse.resolveJunctionGrant(
                { type: 'role', id: 'actor' },
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
                { type: 'role', id: 'actor' },
                { name: 'user_read', realmScope: RealmScope.OWN },
            );
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });
    });
});
