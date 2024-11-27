/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { RequestOptions } from 'hapic';
import { isObject } from '@authup/kit';

export function isClientErrorWithCode(err: unknown, code: `${ErrorCode}`) : boolean {
    if (!isObject(err) || !isObject(err.response)) {
        return false;
    }

    if (err.response.status === 401) {
        return true;
    }

    /* istanbul ignore next */
    if (!isObject(err.response.data) || typeof err.response.data.code !== 'string') {
        return false;
    }

    return err.response.data.code === code;
}

export function isClientTokenExpiredError(err: unknown) {
    return isClientErrorWithCode(err, ErrorCode.TOKEN_EXPIRED);
}

export function isClientTokenInvalidError(err: unknown) {
    return isClientErrorWithCode(err, ErrorCode.TOKEN_INVALID);
}

type RetryState = {
    retryCount: number
};
export function getRequestRetryState(
    config: Partial<RequestOptions> & { retry?: Partial<RetryState> },
) : RetryState {
    const currentState = config.retry || {};
    currentState.retryCount = currentState.retryCount || 0;

    config.retry = currentState;
    return currentState as RetryState;
}
