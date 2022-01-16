/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthorizationHeaderError } from '../../../../src';

describe('src/http/error/authorization-header.ts', () => {
    it('should throw error', () => {
        let simpleError = new AuthorizationHeaderError({});
        expect(() => { throw simpleError; }).toThrowError();

        simpleError = new AuthorizationHeaderError({
            message: 'foo',
        });

        expect(simpleError.getOption('message')).toEqual('foo');
    });
});
