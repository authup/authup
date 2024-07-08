/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy, PermissionItem } from '../../../src';
import { BuiltInPolicyType, PermissionEngine } from '../../../src';

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

const manager = new PermissionEngine();

describe('src/ability/manager.ts', () => {
    it('should set permissions', async () => {
        manager.set(testPermissions);

        const items = await manager.find();
        expect(items.length).toBe(testPermissions.length);
    });

    it('has permission', async () => {
        manager.set(testPermissions);

        expect(await manager.has('user_add')).toBeTruthy();
        expect(await manager.has('something_do')).toBeFalsy();
    });

    it('should work with policy', async () => {
        manager.set(testPermissions);

        expect(await manager.has('user_edit')).toBeTruthy();
        expect(await manager.can('user_edit', { attributes: { name: 'admin' } })).toBeTruthy();
        expect(await manager.can('user_edit', { attributes: { id: '123' } })).toBeFalsy();
    });

    it('clear and check empty permissions', async () => {
        manager.set(testPermissions);
        let items = await manager.find();
        expect(items.length).toEqual(testPermissions.length);

        manager.set([]);
        items = await manager.find();
        expect(items.length).toEqual(0);
    });

    it('should init with permissions', async () => {
        const abilities = new PermissionEngine(testPermissions);

        const items = await abilities.find();
        expect(items.length).toEqual(testPermissions.length);
    });
});
