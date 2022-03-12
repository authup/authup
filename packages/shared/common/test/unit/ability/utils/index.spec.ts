/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityMeta, buildAbilityMetaFromName } from '../../../../src';

describe('src/ability/utils/index.ts', () => {
    it('should build ability', () => {
        let abilityKeys = buildAbilityMetaFromName('user_add');
        expect(abilityKeys).toEqual({ action: 'add', subject: 'User' } as AbilityMeta);

        abilityKeys = buildAbilityMetaFromName('user_permission_add');
        expect(abilityKeys).toEqual({ action: 'add', subject: 'UserPermission' } as AbilityMeta);

        abilityKeys = buildAbilityMetaFromName('user-permission-drop', '-');
        expect(abilityKeys).toEqual({ action: 'drop', subject: 'UserPermission' } as AbilityMeta);
    });

    it('should throw error', () => {
        expect(() => buildAbilityMetaFromName('user')).toThrowError();
    });
});
