/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isClientError } from 'hapic';
import type { RequestOptions } from 'hapic';
import { ErrorCode } from '../../error';
import { isObject } from '../../utils';

export function isAPIClientAuthError(err: unknown) : boolean {
    if (!isClientError(err) || !err.response) {
        return false;
    }

    if (err.response.status === 401) {
        return true;
    }

    /* istanbul ignore next */
    if (!isObject(err.response.data) || typeof err.response.data.code !== 'string') {
        return false;
    }

    return err.response.data.code === ErrorCode.TOKEN_EXPIRED ||
        err.response.data.code === ErrorCode.TOKEN_INVALID;
}

type RetryState = {
    retryCount: number
};
export function getCurrentRequestRetryState(
    config: RequestOptions & { retry?: Partial<RetryState> },
) : RetryState {
    const currentState = config.retry || {};
    currentState.retryCount = currentState.retryCount || 0;

    config.retry = currentState;
    return currentState as RetryState;
}
