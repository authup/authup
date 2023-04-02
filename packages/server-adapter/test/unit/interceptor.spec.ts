/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/core';
import { getCurrentRequestRetryState, isValidAuthenticateError } from '../../src';
import { createResponseError } from '../utils';

describe('src/interceptor/utils', () => {
    it('should be valid response error', () => {
        let error = createResponseError({
            status: 401,
        });
        expect(isValidAuthenticateError(error)).toBeTruthy();

        error = createResponseError({
            status: 500,
            code: ErrorCode.TOKEN_EXPIRED,
        });
        expect(isValidAuthenticateError(error)).toBeTruthy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.TOKEN_INVALID,
        });
        expect(isValidAuthenticateError(error)).toBeTruthy();
    });

    it('should not be valid response error', () => {
        let error = new Error('foo');
        expect(isValidAuthenticateError(error)).toBeFalsy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.CREDENTIALS_INVALID,
        });
        expect(isValidAuthenticateError(error)).toBeFalsy();
    });

    it('should get current request retry state', () => {
        let retryState = getCurrentRequestRetryState({});
        expect(retryState.retryCount).toEqual(0);

        retryState = getCurrentRequestRetryState({ retry: { retryCount: 2 } });
        expect(retryState.retryCount).toEqual(2);
    });
});
