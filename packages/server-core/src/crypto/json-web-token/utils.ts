/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError, hasOwnProperty } from '@authup/core';

export function handleJWTError(e: unknown) {
    if (
        e &&
        typeof e === 'object' &&
        hasOwnProperty(e, 'name')
    ) {
        switch (e.name) {
            case 'TokenExpiredError':
                throw TokenError.expired();
            case 'NotBeforeError': {
                if (
                    hasOwnProperty(e, 'date') &&
                    typeof e.date === 'string'
                ) {
                    throw TokenError.notActiveBefore(e.date);
                }
                break;
            }
            case 'JsonWebTokenError': {
                if (
                    hasOwnProperty(e, 'message') &&
                    typeof e.message === 'string'
                ) {
                    throw TokenError.payloadInvalid(e.message);
                }
            }
        }
    }

    throw new TokenError({
        previous: e as Error,
        decorateMessage: true,
        logMessage: true,
        message: 'The JWT error could not be determined.',
    });
}
