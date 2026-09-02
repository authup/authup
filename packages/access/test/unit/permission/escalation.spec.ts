/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionGrant, PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
    RealmScope,
    aggregatePermissionPolicyBindings,
    grantDominates,
    isPermissionPolicyBindingEqual,
} from '../../../src';

// Mirrors IdentityPermissionProvider.isSuperset over the aggregated disjunction: every child
// grant must be dominated by some parent grant (reach >= AND policy provably covered). Uses the
// shared `grantDominates` so the test cannot drift from production domination semantics.
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
            const dominated = parentItem.grants.some(
                (parentGrant) => grantDominates(parentGrant, childGrant),
            );

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

    // Two genuinely different restrictions (disjoint `attributes` queries). "Different policy"
    // means different CONFIGURATION, not merely a different id — the value-compare strips id.
    const policyDeptX = {
        type: BuiltInPolicyType.ATTRIBUTES,
        id: 'policy-department-x',
        query: { department: 'x' },
    };
    const policyDeptY = {
        type: BuiltInPolicyType.ATTRIBUTES,
        id: 'policy-department-y',
        query: { department: 'y' },
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

    it('should allow: same policy by id even as distinct objects (identity, not reference)', () => {
        const parentPolicy = { type: BuiltInPolicyType.ATTRIBUTES, id: 'realm-bound-id' };
        const childPolicy = { type: BuiltInPolicyType.ATTRIBUTES, id: 'realm-bound-id' };

        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [parentPolicy],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [childPolicy],
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    // --- #3159: policy CONTENT matters — two differently-configured grants must not dominate ---

    it('should block: restricted actor assigning a role restricted by a DIFFERENT policy', () => {
        // Actor reaches only `department=X`; target confers `department=Y`. Both are policy-bound,
        // but on disjoint scopes — the actor must NOT be able to confer reach it does not hold.
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyDeptX],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyDeptY],
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should block: differing policies even when the actor reaches further (any vs own)', () => {
        // Wider realm reach does not excuse a non-matching policy — domination needs BOTH.
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyDeptX],
                realmScope: RealmScope.ANY,
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyDeptY],
                realmScope: RealmScope.OWN,
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: distinct policy rows with identical configuration (value-compare, different id)', () => {
        // Two SEPARATE policy rows (different id) encoding the same restriction = same predicate,
        // so the actor genuinely holds what it confers. id differs; structural config is identical.
        const policyRow1 = {
            type: BuiltInPolicyType.ATTRIBUTES,
            id: 'row-1',
            query: { department: 'x' },
        };
        const policyRow2 = {
            type: BuiltInPolicyType.ATTRIBUTES,
            id: 'row-2',
            query: { department: 'x' },
        };

        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyRow1],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyRow2],
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should allow: a matching policy grant dominates even when another actor grant differs', () => {
        // Disjunction: the actor holds department=X AND department=Y on user_update; assigning a
        // department=Y role is fine because the department=Y grant dominates it (X need not).
        const parent: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyDeptX],
            },
            {
                permission: { name: 'user_update' },
                policies: [policyDeptY],
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_update' },
                policies: [policyDeptY],
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

    // --- realmScope disjunction (#3155): reach is paired with policy PER grant ---

    it('should block: mixed-grant actor (own no-policy + any policy) assigning an unconditional any role', () => {
        // The actor's `any` reach is gated by a policy; it does NOT hold unconditional `any`,
        // so it must not assign a role granting unconditional (any, no-policy). (No collapsed
        // fold can confer this — the child `any` grant is dominated by no parent grant.)
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realmScope: RealmScope.ANY, 
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.ANY },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: mixed-grant actor assigning an own no-policy role (own grant dominates)', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realmScope: RealmScope.ANY, 
            },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should allow: mixed-grant actor assigning an any policy-bound role (any+policy grant dominates)', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realmScope: RealmScope.ANY, 
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' }, 
                policies: [realmBoundPolicy], 
                realmScope: RealmScope.ANY, 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: own-scoped actor assigning an any-scoped role (insufficient reach)', () => {
        const parent: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.OWN },
        ];
        const child: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realmScope: RealmScope.ANY },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should respect permission identity: same name, different realmId', () => {
        const parent: PermissionPolicyBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realmId: 'realm-a',
                },
            },
        ];
        const child: PermissionPolicyBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realmId: 'realm-b',
                },
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });
});

// Direct contract of the per-grant domination primitive used by isSuperset. realmScope is held
// equal so each case isolates the policy-content decision (the #3159 crux), except where noted.
describe('grantDominates', () => {
    const own = RealmScope.OWN;
    // Two differently-CONFIGURED attributes policies (disjoint queries), not just different ids.
    const policyA: PermissionGrant['policy'] = {
        type: BuiltInPolicyType.ATTRIBUTES, 
        id: 'a', 
        query: { department: 'x' }, 
    } as any;
    const policyB: PermissionGrant['policy'] = {
        type: BuiltInPolicyType.ATTRIBUTES, 
        id: 'b', 
        query: { department: 'y' }, 
    } as any;

    it('dominates when both grants are unrestricted at equal reach', () => {
        expect(grantDominates({ realmScope: own }, { realmScope: own })).toBe(true);
    });

    it('an unrestricted parent dominates a restricted child', () => {
        expect(grantDominates({ realmScope: own }, { realmScope: own, policy: policyA })).toBe(true);
    });

    it('a restricted parent does NOT dominate an unrestricted child', () => {
        expect(grantDominates({ realmScope: own, policy: policyA }, { realmScope: own })).toBe(false);
    });

    it('dominates when both reference the same persisted policy (same id)', () => {
        expect(grantDominates(
            { realmScope: own, policy: { type: BuiltInPolicyType.ATTRIBUTES, id: 'a' } as any },
            { realmScope: own, policy: { type: BuiltInPolicyType.ATTRIBUTES, id: 'a' } as any },
        )).toBe(true);
    });

    it('dominates two distinct rows (different id) with identical config (value-compare)', () => {
        expect(grantDominates(
            {
                realmScope: own,
                policy: {
                    type: BuiltInPolicyType.ATTRIBUTES, 
                    id: 'r1', 
                    query: { department: 'x' }, 
                } as any, 
            },
            {
                realmScope: own,
                policy: {
                    type: BuiltInPolicyType.ATTRIBUTES, 
                    id: 'r2', 
                    query: { department: 'x' }, 
                } as any, 
            },
        )).toBe(true);
    });

    it('does NOT dominate two policies with different configuration', () => {
        // Same type, disjoint queries — a shared type is not equivalence (department=X vs =Y).
        expect(grantDominates({ realmScope: own, policy: policyA }, { realmScope: own, policy: policyB })).toBe(false);
    });

    it('dominates id-less policies with identical config (value-compare handles missing id)', () => {
        expect(grantDominates(
            { realmScope: own, policy: { type: BuiltInPolicyType.COMPOSITE, children: [policyA] } as any },
            { realmScope: own, policy: { type: BuiltInPolicyType.COMPOSITE, children: [policyA] } as any },
        )).toBe(true);
    });

    it('does NOT dominate id-less policies whose config differs (fail closed)', () => {
        expect(grantDominates(
            { realmScope: own, policy: { type: BuiltInPolicyType.COMPOSITE, children: [policyA] } as any },
            { realmScope: own, policy: { type: BuiltInPolicyType.COMPOSITE, children: [policyB] } as any },
        )).toBe(false);
    });

    it('does NOT dominate when the parent reaches less far, even for the same policy', () => {
        expect(grantDominates(
            { realmScope: own, policy: policyA },
            { realmScope: RealmScope.ANY, policy: policyA },
        )).toBe(false);
    });

    it('a wider ownOrNull parent dominates an own child; the reverse does not (ordered reach)', () => {
        expect(grantDominates(
            { realmScope: RealmScope.OWN_OR_NULL },
            { realmScope: own },
        )).toBe(true);
        expect(grantDominates(
            { realmScope: own },
            { realmScope: RealmScope.OWN_OR_NULL },
        )).toBe(false);
    });
});
