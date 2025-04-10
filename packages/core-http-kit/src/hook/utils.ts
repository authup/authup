/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RequestOptions } from 'hapic';
import { isObject } from '@authup/kit';

export function getClientErrorCode(err: unknown) : string | null {
    if (!isObject(err) || !isObject(err.response)) {
        return null;
    }

    /* istanbul ignore next */
    if (!isObject(err.response.data) || typeof err.response.data.code !== 'string') {
        return null;
    }

    return err.response.data.code;
}

type RetryState = {
    retryCount: number
};
export function getClientRequestRetryState(
    config: Partial<RequestOptions> & { retry?: Partial<RetryState> },
) : RetryState {
    const currentState = config.retry || {};
    currentState.retryCount = currentState.retryCount || 0;

    config.retry = currentState;
    return currentState as RetryState;
}
