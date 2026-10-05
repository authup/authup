/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

const sym = Symbol('RErrorCode');

/**
 * The error code the error middleware answered the request with. The store
 * is shared by every event of one request, so a middleware that ran earlier
 * (the rate limiter) can read it once its `next()` has resolved.
 */
export function setRequestErrorCode(event: IAppEvent, code: string): void {
    event.store[sym] = code;
}

export function useRequestErrorCode(event: IAppEvent): string | undefined {
    return event.store[sym] as string | undefined;
}
