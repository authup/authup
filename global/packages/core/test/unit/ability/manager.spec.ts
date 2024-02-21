/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ability } from '../../../src';
import { AbilityManager } from '../../../src';

const testPermissions : Ability[] = [
    {
        name: 'user_add', inverse: false, power: 777, target: 'test',
    },
    {
        name: 'user_add', inverse: false, power: 999,
    },
    {
        name: 'user_drop', inverse: false, power: 777, target: 'test',
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
            name: 'user_add',
            power: {
                $lt: 777,
            },
        });

        expect(condition).toBeFalsy();

        condition = manager.satisfy({
            name: 'user_add',
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

    it('should get target', () => {
        manager.set(testPermissions);

        let target = manager.getTarget('user_drop');
        expect(target).toEqual('test');

        target = manager.getTarget('user_add');
        expect(target).toEqual(null);
    });

    it('can and can not', () => {
        manager.set(testPermissions);

        expect(manager.verify('user_add')).toBe(true);
        expect(manager.verify('user_drop')).toBe(true);
        expect(manager.verify('something_do')).toBe(false);
    });

    it('get power', () => {
        manager.set(testPermissions);

        expect(manager.getPower('user_add')).toBe(999);
        expect(manager.getPower({ name: 'user_add', target: 'test' })).toEqual(777);
        expect(manager.getPower('user_drop')).toBe(777);
        expect(manager.getPower('do')).toBeUndefined();
    });

    it('get permission', () => {
        manager.set(testPermissions);

        expect(manager.getOne('user_add')).toBeDefined();
        expect(manager.getOne('something_do')).toBeUndefined();
    });

    it('has permission', () => {
        manager.set(testPermissions);

        expect(manager.has('user_add')).toBeTruthy();
        expect(manager.has('something_do')).toBeFalsy();
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
