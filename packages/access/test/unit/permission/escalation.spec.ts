/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionItem } from '../../../src';
import {
    BuiltInPolicyType,
    isPermissionItemEqual,
    mergePermissionItems,
} from '../../../src';

function isSupersetPolicyAware(
    parentBindings: PermissionItem[],
    childBindings: PermissionItem[],
): boolean {
    const parentMerged = mergePermissionItems(parentBindings);
    const childMerged = mergePermissionItems(childBindings);

    for (const childItem of childMerged) {
        const parentItem = parentMerged.find((p) => isPermissionItemEqual(p, childItem));

        if (!parentItem) {
            return false;
        }

        if (parentItem.policy && !childItem.policy) {
            return false;
        }
    }

    return true;
}

describe('escalation prevention', () => {
    const realmBoundPolicy = { type: BuiltInPolicyType.ATTRIBUTES, id: 'realm-bound-id' };

    it('should allow: unrestricted actor assigning unrestricted role', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read' },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should allow: unrestricted actor assigning restricted role', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read' },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read', policy: realmBoundPolicy },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: restricted actor assigning unrestricted role', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read', policy: realmBoundPolicy },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: restricted actor assigning equally restricted role', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read', policy: realmBoundPolicy },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read', policy: realmBoundPolicy },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: actor missing a permission the role has', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read' },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
            { name: 'user_write' },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: actor with both restricted and unrestricted bindings (merge = unrestricted)', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read', policy: realmBoundPolicy },
            { name: 'user_read' }, // unrestricted via another role
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: actor has restricted binding, target has unrestricted (even with multiple actor bindings)', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read', policy: realmBoundPolicy },
            { name: 'user_read', policy: { type: BuiltInPolicyType.IDENTITY, id: 'other' } },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should handle multiple permissions correctly', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read' },
            { name: 'user_write', policy: realmBoundPolicy },
            { name: 'role_read' },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
            { name: 'user_write', policy: realmBoundPolicy },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: one permission restricted in parent but unrestricted in child', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read' },
            { name: 'user_write', policy: realmBoundPolicy },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read' },
            { name: 'user_write' }, // unrestricted in target
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should respect permission identity: same name, different realm_id', () => {
        const parent: PermissionItem[] = [
            { name: 'user_read', realm_id: 'realm-a' },
        ];
        const child: PermissionItem[] = [
            { name: 'user_read', realm_id: 'realm-b' },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });
});
