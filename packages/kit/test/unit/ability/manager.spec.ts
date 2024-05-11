/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ability } from '../../../src';
import { Abilities } from '../../../src';

const testPermissions : Ability[] = [
    {
        name: 'user_edit', inverse: false, power: 777, target: 'foo',
    },
    {
        name: 'user_edit', inverse: false, power: 888, target: 'bar',
    },
    {
        name: 'user_add', inverse: false, power: 999,
    },
    {
        name: 'user_drop', inverse: false, power: 777, target: 'foo',
    },
];

const manager = new Abilities();

describe('src/ability/manager.ts', () => {
    it('should set permissions', () => {
        manager.set(testPermissions);

        const items = manager.find();
        expect(items.length).toBe(testPermissions.length);
    });

    it('should satisfy target', () => {
        manager.set(testPermissions);

        let match = manager.satisfy('user_drop');
        expect(match).toBeTruthy();

        match = manager.satisfy('user_drop', { target: 'foo' });
        expect(match).toBeTruthy();

        match = manager.satisfy('user_drop', { target: 'bar' });
        expect(match).toBeFalsy();
    });

    it('should get target', () => {
        manager.set(testPermissions);

        let match = manager.findOne('user_drop');
        expect(match.target).toEqual('foo');

        match = manager.findOne('user_add');
        expect(match.target).toEqual(undefined);
    });

    it('can and can not', () => {
        manager.set(testPermissions);

        expect(manager.satisfy({ name: 'user_add' })).toBe(true);
        expect(manager.satisfy('user_drop')).toBe(true);
        expect(manager.satisfy('something_do')).toBe(false);
    });

    it('should work with target & power', () => {
        manager.set(testPermissions);

        expect(manager.satisfy({ name: 'user_edit', target: 'foo', power: 777 })).toBeTruthy();
        expect(manager.satisfy({ name: 'user_edit', target: 'foo', power: 778 })).toBeFalsy();

        expect(manager.satisfy({ name: 'user_edit', target: 'bar', power: 888 })).toBeTruthy();
        expect(manager.satisfy({ name: 'user_edit', target: 'bar', power: 889 })).toBeFalsy();

        expect(manager.satisfy('user_drop', { power: 777 })).toBeTruthy();
        expect(manager.satisfy('user_drop', { power: 778 })).toBeFalsy();
    });

    it('has permission', () => {
        manager.set(testPermissions);

        expect(manager.has('user_add')).toBeTruthy();
        expect(manager.has('something_do')).toBeFalsy();
    });

    it('clear and check empty permissions', () => {
        manager.set(testPermissions);
        let items = manager.find();
        expect(items.length).toEqual(testPermissions.length);

        manager.set([]);
        items = manager.find();
        expect(items.length).toEqual(0);
    });

    it('should init with permissions', () => {
        const abilities = new Abilities(testPermissions);

        const items = abilities.find();
        expect(items.length).toEqual(testPermissions.length);
    });
});
