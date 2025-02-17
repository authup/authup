/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUserNameValid } from '../../../src';

describe('src/domains/user/**', () => {
    it('should validate', () => {
        const name = 'Demario_Botsford25';
        expect(isUserNameValid(name)).toBeTruthy();
    });
    it('should validate user name', () => {
        let name = 'foo';
        expect(isUserNameValid(name)).toBeTruthy();

        name = 'max.mustermann';
        expect(isUserNameValid(name)).toBeTruthy();

        name = 'max-mustermann';
        expect(isUserNameValid(name)).toBeTruthy();

        name = 'max_mustermann';
        expect(isUserNameValid(name)).toBeTruthy();

        name = 'max.mustermann!';
        expect(isUserNameValid(name)).toBeFalsy();

        name = 'bot123';
        expect(isUserNameValid(name)).toBeFalsy();

        name = 'system';
        expect(isUserNameValid(name)).toBeFalsy();

        name = 'fo';
        expect(isUserNameValid(name)).toBeFalsy();

        name = 'ONNyRLjTaKIAlEUO84xPimCVqQYGZKOCdNb9ZM1e';
        expect(isUserNameValid(name)).toBeFalsy();
    });
});
