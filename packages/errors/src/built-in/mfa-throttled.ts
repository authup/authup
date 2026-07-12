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

export const MFA_THROTTLED_ERROR_INSTANCE = Symbol.for('@authup/errors/MfaThrottledError');

export type MfaThrottledErrorOptions = AuthupErrorOptions & {
    /**
     * Seconds until the exponential backoff releases the account.
     */
    retryAfter?: number,
};

export class MfaThrottledError extends AuthupError {
    constructor(input?: MfaThrottledErrorOptions) {
        const { retryAfter, ...rest } = input ?? {};
        super({
            code: ErrorCode.MFA_ATTEMPT_THROTTLED,
            message: 'Too many failed verification attempts. Please try again later.',
            ...rest,
            data: {
                ...(typeof retryAfter === 'number' ? { retryAfter } : {}),
                ...(rest.data ?? {}),
            },
        });
        markInstanceof(this, MFA_THROTTLED_ERROR_INSTANCE);
    }
}
