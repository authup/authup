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
        robotRepository: {} as any,
        roleProvider: { getRolesFor: async () => [] } as any,
    });
}

const policy = { id: 'policy-1', type: BuiltInPolicyType.IDENTITY } as any;

describe('core/identity/permission — IdentityPermissionProvider disjunction (#3155)', () => {
    describe('isSuperset', () => {
        it('blocks a mixed-grant actor (own no-policy + any policy) from assigning an unconditional any role', async () => {
            const provider = createProvider({
                parent: [
                    { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
                    {
                        permission: { name: 'user_read' }, 
                        policies: [policy], 
                        realm_scope: RealmScope.ANY, 
                    },
                ],
                child: [
                    { permission: { name: 'user_read' }, realm_scope: RealmScope.ANY },
                ],
            });

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(false);
        });

        it('allows a mixed-grant actor to assign an own no-policy role', async () => {
            const provider = createProvider({
                parent: [
                    { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
                    {
                        permission: { name: 'user_read' }, 
                        policies: [policy], 
                        realm_scope: RealmScope.ANY, 
                    },
                ],
                child: [
                    { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
                ],
            });

            const result = await provider.isSuperset({ type: 'role', id: 'parent' }, { type: 'role', id: 'child' });
            expect(result).toBe(true);
        });

        it('blocks an own-scoped actor from assigning an any-scoped role (insufficient reach)', async () => {
            const provider = createProvider({
                parent: [{ permission: { name: 'user_read' }, realm_scope: RealmScope.OWN }],
                child: [{ permission: { name: 'user_read' }, realm_scope: RealmScope.ANY }],
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
    });

    describe('resolveJunctionGrant', () => {
        it('selects the most-permissive grant as the ceiling (mixed: any + policy)', async () => {
            const provider = createProvider({
                actor: [
                    { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
                    {
                        permission: { name: 'user_read' }, 
                        policies: [policy], 
                        realm_scope: RealmScope.ANY, 
                    },
                ],
            });

            const result = await provider.resolveJunctionGrant({ type: 'role', id: 'actor' }, { name: 'user_read' });
            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policy?.id).toBe('policy-1');
        });

        it('prefers a policy-free grant on a scope tie (admin stays unrestricted)', async () => {
            const provider = createProvider({
                actor: [
                    {
                        permission: { name: 'user_read' }, 
                        policies: [policy], 
                        realm_scope: RealmScope.ANY, 
                    },
                    { permission: { name: 'user_read' }, realm_scope: RealmScope.ANY },
                ],
            });

            const result = await provider.resolveJunctionGrant({ type: 'role', id: 'actor' }, { name: 'user_read' });
            expect(result.realmScope).toBe(RealmScope.ANY);
            expect(result.policy).toBeUndefined();
        });

        it('defaults to own when the actor holds no matching grant', async () => {
            const provider = createProvider({ actor: [] });

            const result = await provider.resolveJunctionGrant({ type: 'role', id: 'actor' }, { name: 'user_read' });
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policy).toBeUndefined();
        });
    });
});
