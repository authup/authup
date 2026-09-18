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
import { IdentityRoleProvider } from '../../../../../src/core/identity/role/module.ts';

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

async function isRoleSuperset(provider: IdentityPermissionProvider) {
    return provider.isSuperset(
        await provider.getFor({ type: 'role', id: 'parent' }),
        await provider.getFor({ type: 'role', id: 'child' }),
    );
}

const policy = { id: 'policy-1', type: BuiltInPolicyType.IDENTITY } as any;
const policyOther = { id: 'policy-2', type: BuiltInPolicyType.ATTRIBUTES } as any;

describe('core/identity/permission — IdentityPermissionProvider disjunction (#3155)', () => {
    it('resolves every permission a client-owned role carries (#3607)', async () => {
        const provider = createProvider({
            child: [
                { permission: { name: 'user_delete', clientId: null } },
                { permission: { name: 'client_x', clientId: 'x' } },
                { permission: { name: 'client_y', clientId: 'y' } },
            ],
        });

        const bindings = await provider.getFor({
            type: 'role',
            id: 'child',
            clientId: 'x',
        });

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
        }), await provider.getFor(child)))
            .resolves.toBe(false);
        await expect(provider.isSuperset(await provider.getForToken({
            sub: 'u', 
            sub_kind: 'user', 
            client_id: Z, 
        }), await provider.getFor(child)))
            .resolves.toBe(true);
    });
});
