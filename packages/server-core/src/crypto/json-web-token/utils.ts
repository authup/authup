/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/core';
import { isObject } from 'smob';

export function createErrorForJWTError(e: unknown) : TokenError {
    if (
        isObject(e) &&
        typeof e.name === 'string'
    ) {
        switch (e.name) {
            case 'TokenExpiredError': {
                return TokenError.expired();
            }
            case 'NotBeforeError': {
                if (typeof e.date === 'string' || e.date instanceof Date) {
                    return TokenError.notActiveBefore(e.date);
                }
                break;
            }
            case 'JsonWebTokenError': {
                if (typeof e.message === 'string') {
                    return TokenError.payloadInvalid(e.message);
                }

                break;
            }
        }
    }

    return new TokenError({
        previous: e as Error,
        decorateMessage: true,
        logMessage: true,
        message: 'The JWT error could not be determined.',
    });
}
