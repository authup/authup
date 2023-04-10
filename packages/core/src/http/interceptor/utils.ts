/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../../error';
import { isObject } from '../../utils';

export function isValidAuthenticationError(err: unknown) : boolean {
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

    return err.response.data.code === ErrorCode.TOKEN_EXPIRED ||
        err.response.data.code === ErrorCode.TOKEN_INVALID;
}

type RetryState = {
    retryCount: number
};
export function getCurrentRequestRetryState(config: { retry?: Partial<RetryState> }) : RetryState {
    const currentState = config.retry || {};
    currentState.retryCount = currentState.retryCount || 0;

    config.retry = currentState;
    return currentState as RetryState;
}
