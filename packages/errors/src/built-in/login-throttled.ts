/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { markInstanceof } from '@ebec/core';
import { ErrorCode } from '../constants.ts';
import { AuthupError } from '../module.ts';
import type { AuthupErrorOptions } from '../types.ts';

export const LOGIN_THROTTLED_ERROR_INSTANCE = Symbol.for('@authup/errors/LoginThrottledError');

export type LoginThrottledErrorOptions = AuthupErrorOptions & {
    /**
     * Seconds until the sliding throttle window can release the pair.
     */
    retryAfter?: number,
};

export class LoginThrottledError extends AuthupError {
    constructor(input?: LoginThrottledErrorOptions) {
        const { retryAfter, ...rest } = input ?? {};
        super({
            code: ErrorCode.LOGIN_ATTEMPT_THROTTLED,
            message: 'Too many failed login attempts. Please try again later.',
            ...rest,
            data: {
                ...(typeof retryAfter === 'number' ? { retryAfter } : {}),
                ...(rest.data ?? {}),
            },
        });
        markInstanceof(this, LOGIN_THROTTLED_ERROR_INSTANCE);
    }
}
