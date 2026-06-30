/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
    RealmScope,
    aggregatePermissionPolicyBindings,
    compareRealmScope,
    isPermissionPolicyBindingEqual,
} from '../../../src';

// Mirrors IdentityPermissionProvider.isSuperset over the aggregated disjunction: every child
// grant must be dominated by some parent grant (reach >= AND not more policy-restricted).
function isSupersetPolicyAware(
    parentBindings: PermissionPolicyBinding[],
    childBindings: PermissionPolicyBinding[],
): boolean {
    const parentAggregated = aggregatePermissionPolicyBindings(parentBindings);
    const childAggregated = aggregatePermissionPolicyBindings(childBindings);

    for (const childItem of childAggregated) {
        const parentItem = parentAggregated.find((p) => isPermissionPolicyBindingEqual(p, childItem));

        if (!parentItem) {
            return false;
        }

        for (const childGrant of childItem.grants) {
            const dominated = parentItem.grants.some((parentGrant) => (
                compareRealmScope(parentGrant.realm_scope, childGrant.realm_scope) >= 0 &&
                !(parentGrant.policy && !childGrant.policy)
            ));

            if (!dominated) {
                return false;
            }
        }
    }

    return true;
}

describe('escalation prevention', () => {
    const realmBoundPolicy = {
        type: BuiltInPolicyType.ATTRIBUTES,
        id: 'realm-bound-id',
    };

    it('should allow: unrestricted actor assigning unrestricted role', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should allow: unrestricted actor assigning restricted role', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [realmBoundPolicy],
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: restricted actor assigning unrestricted role', () => {
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [realmBoundPolicy],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: restricted actor assigning equally restricted role', () => {
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [realmBoundPolicy],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [realmBoundPolicy],
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: actor missing a permission the role has', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
            { permission: { name: 'user_write' } },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: actor with both restricted and unrestricted bindings (merge = unrestricted)', () => {
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [realmBoundPolicy],
            },
            { permission: { name: 'user_read' } }, // unrestricted via another role
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: actor has restricted binding, target has unrestricted (even with multiple actor bindings)', () => {
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [realmBoundPolicy],
            },
            {
                permission: { name: 'user_read' },
                policies: [{
                    type: BuiltInPolicyType.IDENTITY,
                    id: 'other',
                }],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should handle multiple permissions correctly', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
            {
                permission: { name: 'user_write' },
                policies: [realmBoundPolicy],
            },
            { permission: { name: 'role_read' } },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
            {
                permission: { name: 'user_write' },
                policies: [realmBoundPolicy],
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: one permission restricted in parent but unrestricted in child', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
            {
                permission: { name: 'user_write' },
                policies: [realmBoundPolicy],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
            { permission: { name: 'user_write' } }, // unrestricted in target
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    // --- realm_scope disjunction (#3155): reach is paired with policy PER grant ---

    it('should block: mixed-grant actor (own no-policy + any policy) assigning an unconditional any role', () => {
        // The actor's `any` reach is gated by a policy; it does NOT hold unconditional `any`,
        // so it must not assign a role granting unconditional (any, no-policy). (No collapsed
        // fold can confer this — the child `any` grant is dominated by no parent grant.)
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realm_scope: RealmScope.ANY, 
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.ANY },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: mixed-grant actor assigning an own no-policy role (own grant dominates)', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realm_scope: RealmScope.ANY, 
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should allow: mixed-grant actor assigning an any policy-bound role (any+policy grant dominates)', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realm_scope: RealmScope.ANY, 
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realm_scope: RealmScope.ANY, 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: own-scoped actor assigning an any-scoped role (insufficient reach)', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.ANY },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should respect permission identity: same name, different realm_id', () => {
        const parent: PermissionPolicyBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-a',
                },
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-b',
                },
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });
});
