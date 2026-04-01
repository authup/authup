/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type { PermissionBinding } from '../../../../src';
import { mergePermissionBindings } from '../../../../src';

describe('src/domains/permission-binding/helpers/merge', () => {
    it('should return single item unchanged', () => {
        const items: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeDefined();
        expect(result[0].policies).toHaveLength(1);
        expect(result[0].policies![0].type).toBe('identity');
    });

    it('should produce unrestricted result when any binding has no policy', () => {
        const items: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
            {
                permission: {
                    name: 'user_read' 
                } 
            }, // no policy = unrestricted
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });

    it('should produce composite with AFFIRMATIVE when all bindings have policies', () => {
        const items: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'realmMatch' 
                }] 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeDefined();
        expect(result[0].policies).toHaveLength(1);
        expect(result[0].policies![0].type).toBe('composite');
        expect((result[0].policies![0] as any).decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect((result[0].policies![0] as any).children).toHaveLength(2);
    });

    it('should not merge items with different names', () => {
        const items: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
            {
                permission: {
                    name: 'user_write' 
                },
                policies: [{
                    type: 'identity' 
                }] 
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
                    realm_id: 'realm-a' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
            {
                permission: {
                    name: 'user_read',
                    realm_id: 'realm-b' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(2);
    });

    it('should handle unrestricted with three bindings where one has no policy', () => {
        const items: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'identity' 
                }] 
            },
            {
                permission: {
                    name: 'user_read' 
                },
                policies: [{
                    type: 'realmMatch' 
                }] 
            },
            {
                permission: {
                    name: 'user_read' 
                } 
            }, // unrestricted
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
                    decision_strategy: DecisionStrategy.UNANIMOUS 
                },
                policies: [{
                    type: 'identity' 
                }, {
                    type: 'realmMatch' 
                }],
            },
            {
                permission: {
                    name: 'user_read',
                    decision_strategy: DecisionStrategy.AFFIRMATIVE 
                },
                policies: [{
                    type: 'attributes' 
                }],
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);

        const outer = result[0].policies![0] as any;
        expect(outer.type).toBe('composite');
        expect(outer.decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect(outer.children).toHaveLength(2);

        const firstChild = outer.children[0];
        expect(firstChild.type).toBe('composite');
        expect(firstChild.decision_strategy).toBe(DecisionStrategy.UNANIMOUS);
        expect(firstChild.children).toHaveLength(2);

        const secondChild = outer.children[1];
        expect(secondChild.type).toBe('composite');
        expect(secondChild.decision_strategy).toBe(DecisionStrategy.AFFIRMATIVE);
        expect(secondChild.children).toHaveLength(1);
    });

    it('should handle all unrestricted bindings', () => {
        const items: PermissionBinding[] = [
            {
                permission: {
                    name: 'user_read' 
                } 
            },
            {
                permission: {
                    name: 'user_read' 
                } 
            },
        ];

        const result = mergePermissionBindings(items);
        expect(result).toHaveLength(1);
        expect(result[0].policies).toBeUndefined();
    });
});
