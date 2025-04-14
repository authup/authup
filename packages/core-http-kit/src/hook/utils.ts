/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RequestOptions } from 'hapic';

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
