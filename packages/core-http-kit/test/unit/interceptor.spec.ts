/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/kit';
import { createResponseError } from '../utils';
import {
    APIClient,
    getRequestRetryState,
    hasClientResponseErrorTokenHook,
    isAPIClientErrorWithCode, isAPIClientTokenExpiredError, isAPIClientTokenInvalidError,
    mountClientResponseErrorTokenHook, unmountClientResponseErrorTokenHook,
} from '../../src';

describe('src/interceptor/utils', () => {
    it('should mount and unmount interceptor', () => {
        const client = new APIClient();

        expect(hasClientResponseErrorTokenHook(client)).toBeFalsy();

        mountClientResponseErrorTokenHook(client, {
            tokenCreator: {
                type: 'user',
                name: 'admin',
                password: 'start123',
            },
        });
        expect(hasClientResponseErrorTokenHook(client)).toBeTruthy();

        unmountClientResponseErrorTokenHook(client);
        expect(hasClientResponseErrorTokenHook(client)).toBeFalsy();
    });

    it('should be valid response error', () => {
        let error = createResponseError({
            status: 401,
            code: ErrorCode.TOKEN_INACTIVE,
        });
        expect(isAPIClientErrorWithCode(error, ErrorCode.TOKEN_INACTIVE)).toBeTruthy();

        error = createResponseError({
            status: 500,
            code: ErrorCode.TOKEN_EXPIRED,
        });
        expect(isAPIClientTokenExpiredError(error)).toBeTruthy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.TOKEN_INVALID,
        });
        expect(isAPIClientTokenInvalidError(error)).toBeTruthy();
    });

    it('should not be valid response error', () => {
        let error = new Error('foo');
        expect(isAPIClientErrorWithCode(error, ErrorCode.TOKEN_EXPIRED)).toBeFalsy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.CREDENTIALS_INVALID,
        });
        expect(isAPIClientErrorWithCode(error, ErrorCode.TOKEN_EXPIRED)).toBeFalsy();
    });

    it('should get current request retry state', () => {
        let retryState = getRequestRetryState({});
        expect(retryState.retryCount).toEqual(0);

        retryState = getRequestRetryState({ retry: { retryCount: 2 } });
        expect(retryState.retryCount).toEqual(2);
    });
});
