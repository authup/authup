/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, type AuthupErrorOptionsInput, ErrorCode } from '@authup/errors';

export class JWTError extends AuthupError {
    constructor(...input: AuthupErrorOptionsInput[]) {
        super({
            code: ErrorCode.JWT_INVALID,
            message: 'The JWT is invalid.',
            statusCode: 400,
        }, ...input);
    }

    static invalid() {
        return new JWTError({
            message: 'The JWT is invalid.',
        });
    }

    static expired() {
        return new JWTError({
            code: ErrorCode.JWT_EXPIRED,
            message: 'The JWT has expired.',
        });
    }

    static notFound() {
        return new JWTError({
            message: 'The JWT was not found.',
        });
    }

    static notActive() {
        return new JWTError({
            code: ErrorCode.JWT_INACTIVE,
            message: 'The JWT is not active.',
        });
    }

    static notActiveBefore(date?: string | Date) {
        if (typeof date === 'undefined') {
            return new JWTError({
                code: ErrorCode.JWT_INACTIVE,
                message: 'The token is not active yet.',
            });
        }

        return new JWTError({
            code: ErrorCode.JWT_INACTIVE,
            message: `The token is not active before: ${date}.`,
            data: {
                date,
            },
        });
    }

    static headerInvalid(message?: string) {
        return new JWTError({
            code: ErrorCode.JWT_INVALID,
            message: message || 'The token header is malformed.',
        });
    }

    static headerPropertyInvalid(key: string) {
        return new JWTError({
            code: ErrorCode.JWT_INVALID,
            message: `The token header property ${key} is invalid.`,
        });
    }

    static payloadInvalid(message?: string) {
        return new JWTError({
            code: ErrorCode.JWT_INVALID,
            message: message || 'The token payload is invalid.',
        });
    }

    static payloadPropertyInvalid(key: string) {
        return new JWTError({
            code: ErrorCode.JWT_INVALID,
            message: `The token payload property ${key} is invalid.`,
        });
    }
}
