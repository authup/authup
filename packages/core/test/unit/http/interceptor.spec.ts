/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createResponseError } from '../../utils';
import {
    APIClient,
    ErrorCode,
    getCurrentRequestRetryState,
    isTokenInterceptorMountedOnClient,
    isValidAuthenticationError,
    mountTokenInterceptorOnClient, unmountTokenInterceptorOfClient,
} from '../../../src';

describe('src/interceptor/utils', () => {
    it('should mount and unmount interceptor', () => {
        const client = new APIClient();

        expect(isTokenInterceptorMountedOnClient(client)).toBeFalsy();

        mountTokenInterceptorOnClient(client, {
            tokenCreator: {
                type: 'user',
                name: 'admin',
                password: 'start123',
            },
        });
        expect(isTokenInterceptorMountedOnClient(client)).toBeTruthy();

        unmountTokenInterceptorOfClient(client);
        expect(isTokenInterceptorMountedOnClient(client)).toBeFalsy();
    });

    it('should be valid response error', () => {
        let error = createResponseError({
            status: 401,
        });
        expect(isValidAuthenticationError(error)).toBeTruthy();

        error = createResponseError({
            status: 500,
            code: ErrorCode.TOKEN_EXPIRED,
        });
        expect(isValidAuthenticationError(error)).toBeTruthy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.TOKEN_INVALID,
        });
        expect(isValidAuthenticationError(error)).toBeTruthy();
    });

    it('should not be valid response error', () => {
        let error = new Error('foo');
        expect(isValidAuthenticationError(error)).toBeFalsy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.CREDENTIALS_INVALID,
        });
        expect(isValidAuthenticationError(error)).toBeFalsy();
    });

    it('should get current request retry state', () => {
        let retryState = getCurrentRequestRetryState({});
        expect(retryState.retryCount).toEqual(0);

        retryState = getCurrentRequestRetryState({ retry: { retryCount: 2 } });
        expect(retryState.retryCount).toEqual(2);
    });
});
