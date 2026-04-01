/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PermissionBinding } from '../../../src';
import {
    BuiltInPolicyType,
    isPermissionBindingEqual,
    mergePermissionBindings,
} from '../../../src';

function isSupersetPolicyAware(
    parentBindings: PermissionBinding[],
    childBindings: PermissionBinding[],
): boolean {
    const parentMerged = mergePermissionBindings(parentBindings);
    const childMerged = mergePermissionBindings(childBindings);

    for (const childItem of childMerged) {
        const parentItem = parentMerged.find((p) => isPermissionBindingEqual(p, childItem));

        if (!parentItem) {
            return false;
        }

        if (parentItem.policies && parentItem.policies.length > 0 && (!childItem.policies || childItem.policies.length === 0)) {
            return false;
        }
    }

    return true;
}

describe('escalation prevention', () => {
    const realmBoundPolicy = {
        type: BuiltInPolicyType.ATTRIBUTES,
        id: 'realm-bound-id' 
    };

    it('should allow: unrestricted actor assigning unrestricted role', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should allow: unrestricted actor assigning restricted role', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [realmBoundPolicy] 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: restricted actor assigning unrestricted role', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [realmBoundPolicy] 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: restricted actor assigning equally restricted role', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [realmBoundPolicy] 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [realmBoundPolicy] 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: actor missing a permission the role has', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
            {
                permission: {
                    name: 'user_write' 
                } 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should allow: actor with both restricted and unrestricted bindings (merge = unrestricted)', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [realmBoundPolicy] 
            },
            {
                permission: {
                    name: 'user_read' 
                } 
            }, // unrestricted via another role
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: actor has restricted binding, target has unrestricted (even with multiple actor bindings)', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [realmBoundPolicy] 
            },
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: BuiltInPolicyType.IDENTITY,
                    id: 'other' 
                }] 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should handle multiple permissions correctly', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
            {
                permission: {
                    name: 'user_write' 
                },
                policies: [realmBoundPolicy] 
            },
            {
                permission: {
                    name: 'role_read' 
                } 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
            {
                permission: {
                    name: 'user_write' 
                },
                policies: [realmBoundPolicy] 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(true);
    });

    it('should block: one permission restricted in parent but unrestricted in child', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
            {
                permission: {
                    name: 'user_write' 
                },
                policies: [realmBoundPolicy] 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
            {
                permission: {
                    name: 'user_write' 
                } 
            }, // unrestricted in target
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });

    it('should respect permission identity: same name, different realm_id', () => {
        const parent: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-a' 
                } 
            },
        ];
        const child: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-b' 
                } 
            },
        ];

        expect(isSupersetPolicyAware(parent, child)).toBe(false);
    });
});
