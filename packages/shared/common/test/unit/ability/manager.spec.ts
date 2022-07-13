/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityItemConfig, AbilityManager } from '../../../src';

const testPermissions : AbilityItemConfig[] = [
    {
        id: 'user_add', negation: false, power: 999, target: 'test',
    },
    {
        id: 'user_add', negation: false, power: 777,
    },
    {
        id: 'user_drop', negation: false, power: 777, target: 'test',
    },
];

const manager = new AbilityManager();

describe('src/ability/manager.ts', () => {
    it('should set permissions', () => {
        manager.set(testPermissions);

        const items = manager.getMany();
        expect(items.length).toBe(testPermissions.length);
    });

    it('should satisfy condition', () => {
        manager.set(testPermissions);

        let condition = manager.satisfy({
            id: 'user_add',
            power: {
                $lt: 777,
            },
        });

        expect(condition).toBeFalsy();

        condition = manager.satisfy({
            id: 'user_add',
            power: {
                $eq: 999,
            },
        });

        expect(condition).toBeTruthy();
    });

    it('should match target', () => {
        manager.set(testPermissions);

        let match = manager.matchTarget('user_drop');
        expect(match).toBeFalsy();

        match = manager.matchTarget('user_drop', 'test');
        expect(match).toBeTruthy();
    });

    fit('should get target', () => {
        manager.set(testPermissions);

        let target = manager.getTarget('user_drop');
        expect(target).toEqual('test');

        target = manager.getTarget('user_add');
        expect(target).toEqual(undefined);
    });

    it('can and can not', () => {
        manager.set(testPermissions);

        expect(manager.can('add', 'user')).toBe(true);
        expect(manager.can('drop', 'user')).toBe(true);
        expect(manager.can('do', 'something')).toBe(false);
    });

    it('get power', () => {
        manager.set(testPermissions);

        expect(manager.getPower('add', 'user')).toBe(999);
        expect(manager.getPower('drop', 'user')).toBe(777);
        expect(manager.getPower('do', 'something')).toBeUndefined();
        expect(manager.getPower('do', undefined)).toBeUndefined();
    });

    it('get permission', () => {
        manager.set(testPermissions);

        expect(manager.findPermission('user_add')).toBeDefined();
        expect(manager.findPermission('something_do')).toBeUndefined();
    });

    it('has permission', () => {
        manager.set(testPermissions);

        expect(manager.hasPermission('user_add')).toBeTruthy();
        expect(manager.hasPermission('something_do')).toBeFalsy();
    });

    it('clear and check empty permisisons', () => {
        manager.set(testPermissions);
        let items = manager.getMany();
        expect(items.length).toEqual(testPermissions.length);

        manager.set([]);
        items = manager.getMany();
        expect(items.length).toEqual(0);
    });

    it('should init with permissions', () => {
        const filledManager = new AbilityManager(testPermissions);

        const items = filledManager.getMany();
        expect(items.length).toEqual(testPermissions.length);
    });
});
