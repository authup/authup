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
        name: 'user_edit',
    },
    {
        name: 'user_add',
    },
    {
        name: 'user_drop',
    },
];

const manager = new Abilities();

describe('src/ability/manager.ts', () => {
    it('should set permissions', () => {
        manager.set(testPermissions);

        const items = manager.find();
        expect(items.length).toBe(testPermissions.length);
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
