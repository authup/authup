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
    getRequestRetryState,
    hasClientResponseErrorTokenHook,
    isAPIClientAuthError,
    mountClientResponseErrorTokenHook, unmountClientResponseErrorTokenHook,
} from '../../../src';

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
        });
        expect(isAPIClientAuthError(error)).toBeTruthy();

        error = createResponseError({
            status: 500,
            code: ErrorCode.TOKEN_EXPIRED,
        });
        expect(isAPIClientAuthError(error)).toBeTruthy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.TOKEN_INVALID,
        });
        expect(isAPIClientAuthError(error)).toBeTruthy();
    });

    it('should not be valid response error', () => {
        let error = new Error('foo');
        expect(isAPIClientAuthError(error)).toBeFalsy();

        error = createResponseError({
            status: 400,
            code: ErrorCode.CREDENTIALS_INVALID,
        });
        expect(isAPIClientAuthError(error)).toBeFalsy();
    });

    it('should get current request retry state', () => {
        let retryState = getRequestRetryState({});
        expect(retryState.retryCount).toEqual(0);

        retryState = getRequestRetryState({ retry: { retryCount: 2 } });
        expect(retryState.retryCount).toEqual(2);
    });
});
