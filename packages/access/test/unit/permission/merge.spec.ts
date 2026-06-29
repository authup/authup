/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionPolicyBinding } from '../../../src';
import { DecisionStrategy } from '@authup/kit';
import { BuiltInPolicyType, RealmScope, mergePermissionPolicyBindings } from '../../../src';

describe('src/permission/helpers/merge', () => {
    it('should return single item unchanged', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeDefined();
        expect(result[0].policies).toHaveLength(1);
        expect(result[0].policies![0].type).toBe(BuiltInPolicyType.IDENTITY);
    });

    it('should produce unrestricted result when any binding has no policy', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
            { permission: { name: 'user_read' } }, // no policy = unrestricted
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });

    it('should produce composite with AFFIRMATIVE when all bindings have policies', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.REALM_MATCH }],
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeDefined();
        expect(result[0].policies).toHaveLength(1);
        expect(result[0].policies![0].type).toBe(BuiltInPolicyType.COMPOSITE);
        expect((result[0].policies![0] as any).decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect((result[0].policies![0] as any).children).toHaveLength(2);
    });

    it('should not merge items with different names', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
            {
                permission: { name: 'user_write' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(2);
    });

    it('should not merge items with different realm_id', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-a',
                },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-b',
                },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(2);
    });

    it('should handle unrestricted with three bindings where one has no policy', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
            },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.REALM_MATCH }],
            },
            { permission: { name: 'user_read' } }, // unrestricted
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });

    it('should preserve per-binding decision_strategy in composite tree', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    decision_strategy: DecisionStrategy.UNANIMOUS,
                },
                policies: [{ type: BuiltInPolicyType.IDENTITY }, { type: BuiltInPolicyType.REALM_MATCH }],
            },
            {
                permission: {
                    name: 'user_read',
                    decision_strategy: DecisionStrategy.AFFIRMATIVE,
                },
                policies: [{ type: BuiltInPolicyType.ATTRIBUTES }],
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);

        const outer = result[0].policies![0] as any;
        expect(outer.type).toBe(BuiltInPolicyType.COMPOSITE);
        expect(outer.decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect(outer.children).toHaveLength(2);

        const firstChild = outer.children[0];
        expect(firstChild.type).toBe(BuiltInPolicyType.COMPOSITE);
        expect(firstChild.decision_strategy).toBe(DecisionStrategy.UNANIMOUS);
        expect(firstChild.children).toHaveLength(2);

        const secondChild = outer.children[1];
        expect(secondChild.type).toBe(BuiltInPolicyType.COMPOSITE);
        expect(secondChild.decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect(secondChild.children).toHaveLength(1);
    });

    it('should handle all unrestricted bindings', () => {
        const items: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
            { permission: { name: 'user_read' } },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });

    it('should fold realm_scope by ordered-MAX across grants', () => {
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
                realm_scope: RealmScope.OWN,
            },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.REALM_MATCH }],
                realm_scope: RealmScope.ANY,
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].realm_scope).toBe(RealmScope.ANY);
    });

    it('should coerce a missing realm_scope to own on a single binding', () => {
        const items: PermissionPolicyBinding[] = [
            { permission: { name: 'user_read' } },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result[0].realm_scope).toBe(RealmScope.OWN);
    });

    it('folds an unrestricted high-scope binding to its scope (policy-free `any` => any)', () => {
        // The policy-FREE binding is the `any` one => the actor genuinely holds an
        // unrestricted `any` grant, so the fail-open merge to (any, no-policy) is correct.
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                realm_scope: RealmScope.ANY,
            },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
                realm_scope: RealmScope.OWN,
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
        expect(result[0].realm_scope).toBe(RealmScope.ANY);
    });

    it('does NOT let a policy-bound high-scope binding leak its scope on a fail-open merge', () => {
        // The policy-FREE binding is the LOW-scope `own`; the `any` reach was gated by the
        // (now-dropped) policy. The merged scope must stay `own`, never widen to `any`.
        const items: PermissionPolicyBinding[] = [
            {
                permission: { name: 'user_read' },
                realm_scope: RealmScope.OWN,
            },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }],
                realm_scope: RealmScope.ANY,
            },
        ];

        const result = mergePermissionPolicyBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
        expect(result[0].realm_scope).toBe(RealmScope.OWN);
    });

    describe('grants (per-grant disjunction terms)', () => {
        it('emits a single term for a single grant, carrying scope + policies + decision_strategy', () => {
            const items: PermissionPolicyBinding[] = [
                {
                    permission: { name: 'user_read', decision_strategy: DecisionStrategy.AFFIRMATIVE },
                    policies: [{ type: BuiltInPolicyType.IDENTITY }],
                    realm_scope: RealmScope.ANY,
                },
            ];

            const result = mergePermissionPolicyBindings(items);
            expect(result[0].grants).toHaveLength(1);
            expect(result[0].grants![0].realm_scope).toBe(RealmScope.ANY);
            expect(result[0].grants![0].policies).toHaveLength(1);
            expect(result[0].grants![0].decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        });

        it('coerces a missing scope to own on the single grant term (fail-closed)', () => {
            const result = mergePermissionPolicyBindings([{ permission: { name: 'user_read' } }]);
            expect(result[0].grants).toHaveLength(1);
            expect(result[0].grants![0].realm_scope).toBe(RealmScope.OWN);
        });

        it('preserves each grant scope+policy correlation for the mixed policy-free/own + policy-bound/any case', () => {
            // The collapsed fields stay lossy (own, no policy); the disjunction terms keep
            // the (any, IDENTITY) reach the evaluator needs to restore — issue #3155.
            const items: PermissionPolicyBinding[] = [
                {
                    permission: { name: 'user_read' },
                    realm_scope: RealmScope.OWN,
                },
                {
                    permission: { name: 'user_read' },
                    policies: [{ type: BuiltInPolicyType.IDENTITY }],
                    realm_scope: RealmScope.ANY,
                },
            ];

            const result = mergePermissionPolicyBindings(items);
            expect(result).toHaveLength(1);

            // collapsed (unchanged): fail-closed own, policy dropped
            expect(result[0].realm_scope).toBe(RealmScope.OWN);
            expect(result[0].policies).toBeUndefined();

            // disjunction terms (new): each grant keeps its own (scope, policies)
            expect(result[0].grants).toHaveLength(2);
            const own = result[0].grants!.find((g) => g.realm_scope === RealmScope.OWN);
            const any = result[0].grants!.find((g) => g.realm_scope === RealmScope.ANY);
            expect(own).toBeDefined();
            expect(own!.policies).toBeUndefined();
            expect(any).toBeDefined();
            expect(any!.policies).toHaveLength(1);
            expect(any!.policies![0].type).toBe(BuiltInPolicyType.IDENTITY);
        });

        it('keeps per-grant scope on the all-policy-bound case (does not pre-fold to MAX)', () => {
            const items: PermissionPolicyBinding[] = [
                {
                    permission: { name: 'user_read' },
                    policies: [{ type: BuiltInPolicyType.IDENTITY }],
                    realm_scope: RealmScope.OWN,
                },
                {
                    permission: { name: 'user_read' },
                    policies: [{ type: BuiltInPolicyType.REALM_MATCH }],
                    realm_scope: RealmScope.ANY,
                },
            ];

            const result = mergePermissionPolicyBindings(items);
            // collapsed scope still folds to MAX (unchanged for the other consumers)
            expect(result[0].realm_scope).toBe(RealmScope.ANY);
            // but each term keeps its own scope so the evaluator does not let the own grant
            // ride the any reach
            expect(result[0].grants).toHaveLength(2);
            expect(result[0].grants!.map((g) => g.realm_scope).sort())
                .toEqual([RealmScope.ANY, RealmScope.OWN].sort());
        });
    });
});
