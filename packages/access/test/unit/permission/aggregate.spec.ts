/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type { PermissionPolicyBinding } from '../../../src';
import { BuiltInPolicyType, RealmScope, aggregatePermissionPolicyBindings } from '../../../src';

describe('src/permission/helpers/aggregate', () => {
    it('emits one grant for a single binding, coercing a missing scope to own', () => {
        const result = aggregatePermissionPolicyBindings([{ permission: { name: 'user_read' } }]);
        expect(result).toHaveLength(1);
        expect(result[0].grants).toHaveLength(1);
        expect(result[0].grants[0].realm_scope).toBe(RealmScope.OWN);
        expect(result[0].grants[0].policy).toBeUndefined();
    });

    it('preserves a single policy raw (id intact for propagation)', () => {
        const policy = { id: 'p1', type: BuiltInPolicyType.IDENTITY } as any;
        const result = aggregatePermissionPolicyBindings([
            {
                permission: { name: 'user_read' }, 
                policies: [policy], 
                realm_scope: RealmScope.ANY, 
            },
        ]);
        expect(result[0].grants[0].policy).toBe(policy);
        expect((result[0].grants[0].policy as any).id).toBe('p1');
        expect(result[0].grants[0].realm_scope).toBe(RealmScope.ANY);
    });

    it('wraps multiple policies in a composite under the permission decision_strategy', () => {
        const result = aggregatePermissionPolicyBindings([
            {
                permission: { name: 'user_read', decision_strategy: DecisionStrategy.AFFIRMATIVE },
                policies: [{ type: BuiltInPolicyType.IDENTITY }, { type: BuiltInPolicyType.REALM_MATCH }],
            },
        ]);
        const policy = result[0].grants[0].policy as any;
        expect(policy.type).toBe(BuiltInPolicyType.COMPOSITE);
        expect(policy.decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect(policy.children).toHaveLength(2);
    });

    it('keeps each grant of a permission as a distinct disjunction term', () => {
        const items: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' }, realm_scope: RealmScope.OWN },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
                realm_scope: RealmScope.ANY,
            },
        ];

        const result = aggregatePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].grants).toHaveLength(2);

        const own = result[0].grants.find((g) => g.realm_scope === RealmScope.OWN)!;
        const any = result[0].grants.find((g) => g.realm_scope === RealmScope.ANY)!;
        expect(own.policy).toBeUndefined();
        expect(any.policy!.type).toBe(BuiltInPolicyType.IDENTITY);
    });

    it('does not merge different permission keys', () => {
        const result = aggregatePermissionPolicyBindings([
            { permission: { name: 'user_read', realm_id: 'a' } },
            { permission: { name: 'user_read', realm_id: 'b' } },
            { permission: { name: 'user_write' } },
        ]);
        expect(result).toHaveLength(3);
    });
});
