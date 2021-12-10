/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthorizationHeaderError } from '../../../../src';

describe('src/http/error/authorization-header.ts', () => {
    it('should throw error', () => {
        const simpleError = new AuthorizationHeaderError('');
        expect(() => { throw simpleError; }).toThrowError();
        expect(simpleError.code).toEqual('invalid_header');
    });

    it('should throw another error code', () => {
        const simpleError = new AuthorizationHeaderError('', 'invalid_value');
        expect(simpleError.code).toEqual('invalid_value');
    });
});
