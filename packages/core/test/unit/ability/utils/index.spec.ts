import {createAbilityKeysFromPermissionID} from "../../../../src/ability/utils";

describe('src/ability/utils/index.ts', () => {
    it('should throw error', () => {
        const abilityKeys = createAbilityKeysFromPermissionID('user_add');

        expect(abilityKeys).toEqual({action: 'add', subject: 'user'});

        expect(() => createAbilityKeysFromPermissionID('user')).toThrowError();
    });
});
