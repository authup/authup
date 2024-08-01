/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isValidUserName } from '../../../src';

describe('src/domains/user/**', () => {
    it('should validate', () => {
        const name = 'Demario_Botsford25';
        expect(isValidUserName(name)).toBeTruthy();
    });
    it('should validate user name', () => {
        let name = 'foo';
        expect(isValidUserName(name)).toBeTruthy();

        name = 'max.mustermann';
        expect(isValidUserName(name)).toBeTruthy();

        name = 'max-mustermann';
        expect(isValidUserName(name)).toBeTruthy();

        name = 'max_mustermann';
        expect(isValidUserName(name)).toBeTruthy();

        name = 'max.mustermann!';
        expect(isValidUserName(name)).toBeFalsy();

        name = 'bot123';
        expect(isValidUserName(name)).toBeFalsy();

        name = 'system';
        expect(isValidUserName(name)).toBeFalsy();

        name = 'fo';
        expect(isValidUserName(name)).toBeFalsy();

        name = 'ONNyRLjTaKIAlEUO84xPimCVqQYGZKOCdNb9ZM1e';
        expect(isValidUserName(name)).toBeFalsy();
    });
});
