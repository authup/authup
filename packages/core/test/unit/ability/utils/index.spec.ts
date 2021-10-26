/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {createAbilityKeysFromPermissionID} from "../../../../src";

describe('src/ability/utils/index.ts', () => {
    it('should throw error', () => {
        const abilityKeys = createAbilityKeysFromPermissionID('user_add');

        expect(abilityKeys).toEqual({action: 'add', subject: 'user'});

        expect(() => createAbilityKeysFromPermissionID('user')).toThrowError();
    });
});
