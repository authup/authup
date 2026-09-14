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

export const DEVICE_VERIFICATION_THROTTLED_ERROR_INSTANCE = Symbol.for('@authup/errors/DeviceVerificationThrottledError');

export type DeviceVerificationThrottledErrorOptions = AuthupErrorOptions & {
    /**
     * Seconds until the per-actor lookup window releases the account.
     */
    retryAfter?: number,
};

export class DeviceVerificationThrottledError extends AuthupError {
    constructor(input?: DeviceVerificationThrottledErrorOptions) {
        const { retryAfter, ...rest } = input ?? {};
        super({
            code: ErrorCode.OAUTH_DEVICE_VERIFICATION_THROTTLED,
            message: 'Too many verification attempts. Try again later.',
            ...rest,
            data: {
                ...(typeof retryAfter === 'number' ? { retryAfter } : {}),
                ...(rest.data ?? {}),
            },
        });
        markInstanceof(this, DEVICE_VERIFICATION_THROTTLED_ERROR_INSTANCE);
    }
}
