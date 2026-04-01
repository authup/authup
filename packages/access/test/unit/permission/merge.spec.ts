/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionBinding } from '../../../src';
import { BuiltInPolicyType, DecisionStrategy, mergePermissionBindings } from '../../../src';

describe('src/permission/helpers/merge', () => {
    it('should return single item unchanged', () => {
        const items: PermissionBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }], 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeDefined();
        expect(result[0].policies).toHaveLength(1);
        expect(result[0].policies![0].type).toBe(BuiltInPolicyType.IDENTITY);
    });

    it('should produce unrestricted result when any binding has no policy', () => {
        const items: PermissionBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }], 
            },
            { permission: { name: 'user_read' } }, // no policy = unrestricted
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });

    it('should produce composite with AFFIRMATIVE when all bindings have policies', () => {
        const items: PermissionBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }], 
            },
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.REALM_MATCH }], 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeDefined();
        expect(result[0].policies).toHaveLength(1);
        expect(result[0].policies![0].type).toBe(BuiltInPolicyType.COMPOSITE);
        expect((result[0].policies![0] as any).decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect((result[0].policies![0] as any).children).toHaveLength(2);
    });

    it('should not merge items with different names', () => {
        const items: PermissionBinding[] = [
            {
                permission: { name: 'user_read' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }], 
            },
            {
                permission: { name: 'user_write' },
                policies: [{ type: BuiltInPolicyType.IDENTITY }], 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(2);
    });

    it('should not merge items with different realm_id', () => {
        const items: PermissionBinding[] = [
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

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(2);
    });

    it('should handle unrestricted with three bindings where one has no policy', () => {
        const items: PermissionBinding[] = [
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

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });

    it('should preserve per-binding decision_strategy in composite tree', () => {
        const items: PermissionBinding[] = [
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

        const result = mergePermissionBindings(items);
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
        const items: PermissionBinding[] = [
            { permission: { name: 'user_read' } },
            { permission: { name: 'user_read' } },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });
});
