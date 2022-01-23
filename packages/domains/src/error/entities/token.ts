/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ErrorOptions, mergeErrorOptions } from '@typescript-error/http';
import { ErrorCode } from '../constants';

export class TokenError extends BadRequestError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            code: ErrorCode.TOKEN_INVALID,
            message: 'The Token is invalid.',
        }, (options || {})));
    }

    static kindInvalid() {
        return new TokenError({
            message: 'The token kind is invalid.',
        });
    }

    static accessTokenRequired() {
        return new TokenError({
            message: 'An access token is required to authenticate.',
        });
    }

    static subKindInvalid() {
        return new TokenError({
            code: ErrorCode.TOKEN_SUB_KIND_INVALID,
            message: 'The token sub kind is invalid.',
        });
    }

    static expired() {
        return new TokenError({
            code: ErrorCode.TOKEN_EXPIRED,
            message: 'The token has been expired.',
        });
    }

    static notActiveBefore(date: string) {
        return new TokenError({
            code: ErrorCode.TOKEN_INACTIVE,
            message: `The token is not active before: ${date}.`,
            date,
        });
    }

    static jwtInvalid(message?: string) {
        return new TokenError({
            code: ErrorCode.TOKEN_INVALID,
            message: message || 'The token payload is malformed.',
        });
    }
}
