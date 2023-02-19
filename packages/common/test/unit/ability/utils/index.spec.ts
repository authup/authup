/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AbilityID } from '../../../../src';
import { buildAbilityMetaFromName } from '../../../../src';

describe('src/ability/utils/index.ts', () => {
    it('should build ability', () => {
        let abilityKeys = buildAbilityMetaFromName('user_add');
        expect(abilityKeys).toEqual({ action: 'add', subject: 'User' } as AbilityID);

        abilityKeys = buildAbilityMetaFromName('user_permission_add');
        expect(abilityKeys).toEqual({ action: 'add', subject: 'UserPermission' } as AbilityID);

        abilityKeys = buildAbilityMetaFromName('user-permission-drop', '-');
        expect(abilityKeys).toEqual({ action: 'drop', subject: 'UserPermission' } as AbilityID);
    });

    it('should throw error', () => {
        expect(() => buildAbilityMetaFromName('user')).toThrowError();
    });
});
