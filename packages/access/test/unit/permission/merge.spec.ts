/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionItem } from '../../../src';
import { BuiltInPolicyType, DecisionStrategy, mergePermissionItems } from '../../../src';

describe('src/permission/helpers/merge', () => {
    it('should return single item unchanged', () => {
        const items: PermissionItem[] = [
            { name: 'user_read', policy: { type: BuiltInPolicyType.IDENTITY } },
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].policy).toBeDefined();
        expect(result[0].policy!.type).toBe(BuiltInPolicyType.IDENTITY);
    });

    it('should produce unrestricted result when any binding has no policy', () => {
        const items: PermissionItem[] = [
            { name: 'user_read', policy: { type: BuiltInPolicyType.IDENTITY } },
            { name: 'user_read' }, // no policy = unrestricted
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].policy).toBeUndefined();
    });

    it('should produce composite with AFFIRMATIVE when all bindings have policies', () => {
        const items: PermissionItem[] = [
            { name: 'user_read', policy: { type: BuiltInPolicyType.IDENTITY } },
            { name: 'user_read', policy: { type: BuiltInPolicyType.REALM_MATCH } },
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].policy).toBeDefined();
        expect(result[0].policy!.type).toBe(BuiltInPolicyType.COMPOSITE);
        expect((result[0].policy as any).decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect((result[0].policy as any).children).toHaveLength(2);
    });

    it('should not merge items with different names', () => {
        const items: PermissionItem[] = [
            { name: 'user_read', policy: { type: BuiltInPolicyType.IDENTITY } },
            { name: 'user_write', policy: { type: BuiltInPolicyType.IDENTITY } },
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(2);
    });

    it('should not merge items with different realm_id', () => {
        const items: PermissionItem[] = [
            { name: 'user_read', realm_id: 'realm-a', policy: { type: BuiltInPolicyType.IDENTITY } },
            { name: 'user_read', realm_id: 'realm-b', policy: { type: BuiltInPolicyType.IDENTITY } },
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(2);
    });

    it('should handle unrestricted with three bindings where one has no policy', () => {
        const items: PermissionItem[] = [
            { name: 'user_read', policy: { type: BuiltInPolicyType.IDENTITY } },
            { name: 'user_read', policy: { type: BuiltInPolicyType.REALM_MATCH } },
            { name: 'user_read' }, // unrestricted
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].policy).toBeUndefined();
    });

    it('should handle all unrestricted bindings', () => {
        const items: PermissionItem[] = [
            { name: 'user_read' },
            { name: 'user_read' },
        ];

        const result = mergePermissionItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].policy).toBeUndefined();
    });
});
