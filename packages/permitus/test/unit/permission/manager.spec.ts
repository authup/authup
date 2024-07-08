/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy, PermissionItem } from '../../../src';
import { BuiltInPolicyType, PermissionManager, PermissionMemoryRepository } from '../../../src';

const testPermissions : PermissionItem[] = [
    {
        name: 'user_edit',
        policy: {
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            names: ['name'],
        } satisfies AttributeNamesPolicy,
    },
    {
        name: 'user_add',
    },
    {
        name: 'user_drop',
    },
];

const repository = new PermissionMemoryRepository(testPermissions);
const manager = new PermissionManager({ repository });

describe('src/ability/manager.ts', () => {
    it('has permission', async () => {
        expect(await manager.has('user_add')).toBeTruthy();
        expect(await manager.has('something_do')).toBeFalsy();
    });

    it('should work with policy', async () => {
        expect(await manager.has('user_edit')).toBeTruthy();
        expect(await manager.can('user_edit', { attributes: { name: 'admin' } })).toBeTruthy();
        expect(await manager.can('user_edit', { attributes: { id: '123' } })).toBeFalsy();
    });
});
