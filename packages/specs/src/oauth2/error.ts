/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode } from '@authup/errors';
import type { AuthupErrorOptionsInput } from '@authup/errors';
import { OAuth2ErrorCode } from './constants';

export class OAuth2Error extends AuthupError {
    constructor(...input: AuthupErrorOptionsInput[]) {
        super({
            code: ErrorCode.JWT_INVALID,
            message: 'The Token is invalid.',
            statusCode: 400,
            data: {
                error: OAuth2ErrorCode.INVALID_REQUEST,
            },
        }, ...input);
    }

    // -------------------------------------------------

    static clientInvalid() {
        return new OAuth2Error({
            message: 'Client authentication failed.',
            code: ErrorCode.OAUTH_CLIENT_INVALID,
            data: {
                error: OAuth2ErrorCode.INVALID_CLIENT,
            },
        });
    }

    static grantInvalid(message?: string) {
        return new OAuth2Error({
            message: message || 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token ' +
                'is invalid, expired, revoked, does not match the redirection URI used in the authorization request, ' +
                'or was issued to another client.',
            code: ErrorCode.OAUTH_GRANT_INVALID,
            data: {
                error: OAuth2ErrorCode.INVALID_GRANT,
            },
        });
    }

    static grantTypeUnsupported() {
        return new OAuth2Error({
            message: 'The authorization grant type is not supported by the authorization server.',
            code: ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED,
            data: {
                hint: 'Check that all required parameters have been provided',
                error: OAuth2ErrorCode.UNSUPPORTED_GRANT_TYPE,
            },
        });
    }

    static requestInvalid(message?: string) {
        return new OAuth2Error({
            message: message || 'The request is missing a required parameter, includes an unsupported parameter value, ' +
                'repeats a parameter, or is otherwise malformed.',
            data: {
                hint: 'Check that all parameters have been provided correctly',
                error: OAuth2ErrorCode.INVALID_REQUEST,
            },
        });
    }

    static scopeInvalid() {
        return new OAuth2Error({
            message: 'The requested scope is invalid, unknown or malformed.',
            code: ErrorCode.OAUTH_SCOPE_INVALID,
            data: {
                error: OAuth2ErrorCode.INVALID_SCOPE,
            },
        });
    }

    static scopeInsufficient() {
        return new OAuth2Error({
            message: 'The request requires higher privileges than supported by the client.',
            code: ErrorCode.OAUTH_SCOPE_INSUFFICIENT,
            data: {
                error: OAuth2ErrorCode.INVALID_GRANT,
            },
        });
    }

    static redirectUriMismatch() {
        return new OAuth2Error({
            message: 'The redirect URI is missing or do not match',
            code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH,
            data: {
                error: OAuth2ErrorCode.INVALID_GRANT,
            },
        });
    }

    static responseTypeUnsupported() {
        return new OAuth2Error({
            message: 'The authorization server does not support obtaining an access token using this method.',
        });
    }

    static signingKeyMissing() {
        return new OAuth2Error({
            message: 'A token signing key could not be retrieved.',
        });
    }
}
