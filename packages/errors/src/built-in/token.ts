/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenKind } from '@authup/schema';
import type { OAuth2SubKind } from '@authup/schema';
import { ErrorCode } from '../constants';
import { AuthupError } from '../module';
import type { AuthupErrorOptionsInput } from '../types';

export class TokenError extends AuthupError {
    constructor(...input: AuthupErrorOptionsInput[]) {
        super({
            code: ErrorCode.TOKEN_INVALID,
            message: 'The Token is invalid.',
            statusCode: 400,
        }, ...input);
    }

    // -------------------------------------------------

    static subKindInvalid() {
        return new TokenError({
            code: ErrorCode.TOKEN_SUB_KIND_INVALID,
            message: 'The token sub kind is invalid.',
        });
    }

    static expired(kind?: `${OAuth2TokenKind}`) {
        return new TokenError({
            code: ErrorCode.TOKEN_EXPIRED,
            message: `The ${kind || 'token'} has expired.`,
        });
    }

    static kindInvalid() {
        return new TokenError({
            message: 'The token kind is invalid.',
        });
    }

    static notActiveBefore(date?: string | Date) {
        if (typeof date === 'undefined') {
            return new TokenError({
                code: ErrorCode.TOKEN_INACTIVE,
                message: 'The token is not active yet.',
            });
        }

        return new TokenError({
            code: ErrorCode.TOKEN_INACTIVE,
            message: `The token is not active before: ${date}.`,
            data: {
                date,
            },
        });
    }

    static headerInvalid(message?: string) {
        return new TokenError({
            code: ErrorCode.TOKEN_INVALID,
            message: message || 'The token header is malformed.',
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

    static grantInvalid(message?: string) {
        return new TokenError({
            message: message || 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token ' +
                'is invalid, expired, revoked, does not match the redirection URI used in the authorization request, ' +
                'or was issued to another client.',
            code: ErrorCode.TOKEN_GRANT_INVALID,
        });
    }

    static grantTypeUnsupported() {
        return new TokenError({
            message: 'The authorization grant type is not supported by the authorization server.',
            code: ErrorCode.TOKEN_GRANT_TYPE_UNSUPPORTED,
            data: {
                hint: 'Check that all required parameters have been provided',
            },
        });
    }

    static tokenInvalid(kind?: `${OAuth2TokenKind}`) {
        return new TokenError({
            message: `The ${kind || 'token'} is invalid.`,
        });
    }

    static tokenNotFound(kind: `${OAuth2TokenKind}` = OAuth2TokenKind.ACCESS) {
        return new TokenError({
            message: `The ${kind} was not found.`,
        });
    }

    static requestInvalid(message?: string) {
        return new TokenError({
            message: message || 'The request is missing a required parameter, includes an unsupported parameter value, ' +
                'repeats a parameter, or is otherwise malformed.',
            data: {
                hint: 'Check that all parameters have been provided correctly',
            },
        });
    }

    static scopeInvalid() {
        return new TokenError({
            message: 'The requested scope is invalid, unknown or malformed.',
            code: ErrorCode.TOKEN_SCOPE_INVALID,
        });
    }

    static scopeInsufficient() {
        return new TokenError({
            message: 'The request requires higher privileges than provided by the access token.',
            code: ErrorCode.TOKEN_SCOPE_INSUFFICIENT,
        });
    }

    static redirectUriMismatch() {
        return new TokenError({
            message: 'The redirect URI is missing or do not match',
            code: ErrorCode.TOKEN_REDIRECT_URI_MISMATCH,
        });
    }

    static responseTypeUnsupported() {
        return new TokenError({
            message: 'The authorization server does not support obtaining an access token using this method.',
        });
    }

    static inactive() {
        return new TokenError({
            code: ErrorCode.TOKEN_INACTIVE,
            message: 'The  token is not active.',
        });
    }

    static targetInactive(kind: `${OAuth2SubKind}`) {
        return new TokenError({
            message: `The target token ${kind} is not active.`,
        });
    }

    static signingKeyMissing() {
        return new TokenError({
            message: 'A token signing key could not be retrieved.',
        });
    }
}
