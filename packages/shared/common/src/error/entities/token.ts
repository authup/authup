/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ErrorOptions, mergeErrorOptions } from '@typescript-error/http';
import { ErrorCode } from '../constants';
import { OAuth2TokenSubKind } from '../../domains';

export class TokenError extends BadRequestError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            code: ErrorCode.TOKEN_INVALID,
            message: 'The Token is invalid.',
        }, (options || {})));
    }

    // -------------------------------------------------

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

    static kindInvalid() {
        return new TokenError({
            message: 'The token kind is invalid.',
        });
    }

    static notActiveBefore(date: string) {
        return new TokenError({
            code: ErrorCode.TOKEN_INACTIVE,
            message: `The token is not active before: ${date}.`,
            date,
        });
    }

    static payloadInvalid(message?: string) {
        return new TokenError({
            code: ErrorCode.TOKEN_INVALID,
            message: message || 'The token payload is malformed.',
        });
    }

    // -------------------------------------------------

    static accessTokenRequired() {
        return new TokenError({
            message: 'An access token is required to authenticate.',
        });
    }

    static clientInvalid() {
        return new TokenError({
            message: 'Client authentication failed.',
            code: ErrorCode.TOKEN_CLIENT_INVALID,
        });
    }

    static grantInvalid() {
        return new TokenError({
            message: 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token ' +
                'is invalid, expired, revoked, does not match the redirection URI used in the authorization request, ' +
                'or was issued to another client.',
            code: ErrorCode.TOKEN_GRANT_INVALID,
        });
    }

    static grantTypeUnsupported() {
        return new TokenError({
            message: 'The authorization grant type is not supported by the authorization server.',
            code: ErrorCode.TOKEN_GRANT_TYPE_UNSUPPORTED,
            hint: 'Check that all required parameters have been provided',
        });
    }

    static refreshTokenInvalid() {
        return new TokenError({
            message: 'The refresh token is invalid.',
        });
    }

    static requestInvalid() {
        return new TokenError({
            message: 'The request is missing a required parameter, includes an invalid parameter value, ' +
                'includes a parameter more than once, or is otherwise malformed.',
            hint: 'Check that all parameters have been provided correctly',
        });
    }

    static scopeInvalid() {
        return new TokenError({
            message: 'The scope is malformed or invalid.',
            code: ErrorCode.TOKEN_SCOPE_INVALID,
        });
    }

    static targetInactive(kind: `${OAuth2TokenSubKind}`) {
        return new TokenError({
            message: `The target token ${kind} is not active.`,
        });
    }
}
