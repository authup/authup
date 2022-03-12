/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityManager, PermissionMeta } from '../../../src';

const testPermissions : PermissionMeta[] = [
    { id: 'user_add', negation: false, power: 999 },
    { id: 'user_add', negation: false, power: 999 },
    { id: 'user_add', negation: false, power: 777 },
    { id: 'user_drop', negation: false, power: 777 },
];

const manager = new AbilityManager();

describe('src/ability/manager.ts', () => {
    it('should set permissions', () => {
        manager.setPermissions(testPermissions);

        expect(manager.getPermissions()).toBe(testPermissions);
    });

    it('can and can not', () => {
        manager.setPermissions(testPermissions);

        expect(manager.can('add', 'user')).toBe(true);
        expect(manager.can('drop', 'user')).toBe(true);
        expect(manager.can('do', 'something')).toBe(false);
    });

    it('get power', () => {
        manager.setPermissions(testPermissions);

        expect(manager.getPower('add', 'user')).toBe(999);
        expect(manager.getPower('drop', 'user')).toBe(777);
        expect(manager.getPower('do', 'something')).toBeUndefined();
        expect(manager.getPower('do', undefined)).toBeUndefined();
    });

    it('get permission', () => {
        manager.setPermissions(testPermissions);

        expect(manager.findPermission('user_add')).toBeDefined();
        expect(manager.findPermission('user_add')).toEqual(testPermissions[0]);
        expect(manager.findPermission('something_do')).toBeUndefined();
    });

    it('has permission', () => {
        manager.setPermissions(testPermissions);

        expect(manager.hasPermission('user_add')).toBeTruthy();
        expect(manager.hasPermission('something_do')).toBeFalsy();
    });

    it('clear and check empty permisisons', () => {
        manager.setPermissions(testPermissions);

        manager.setPermissions([]);

        expect(manager.getPermissions()).toEqual([]);
    });

    it('should init with permissions', () => {
        const filledManager = new AbilityManager(testPermissions);

        expect(filledManager.getPermissions()).toEqual(testPermissions);
    });
});
