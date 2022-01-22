/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ErrorOptions, mergeErrorOptions } from '@typescript-error/http';

export class OAuth2ServerError extends BadRequestError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            code: 'invalid_request',
            message: 'The OAuth2 Service encountered an unexpected error.',
        }, options));
    }

    static unsupportedGrantType() {
        return new OAuth2ServerError({
            message: 'The authorization grant type is not supported by the authorization server.',
            code: 'unsupported_grant_type',
            hint: 'Check that all required parameters have been provided',
        });
    }

    static invalidRequest() {
        return new OAuth2ServerError({
            message: 'The request is missing a required parameter, includes an invalid parameter value, ' +
            'includes a parameter more than once, or is otherwise malformed.',
            code: 'invalid_request',
            hint: 'Check that all parameters have been provided correctly',
        });
    }

    static invalidClient() {
        return new OAuth2ServerError({
            message: 'Client authentication failed.',
            code: 'invalid_client',
        });
    }

    static invalidScope() {
        return new OAuth2ServerError({
            message: 'Specify a scope in the request or set a default scope.',
            code: 'invalid_scope',
        });
    }

    static invalidCredentials() {
        return new OAuth2ServerError({
            message: 'The credentials were incorrect.',
            code: 'invalid_credentials',
        });
    }

    static invalidRefreshToken() {
        return new OAuth2ServerError({
            message: 'The refresh token is invalid.',
            code: 'invalid_request',
        });
    }

    static invalidGrant() {
        return new OAuth2ServerError({
            message: 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token ' +
                'is invalid, expired, revoked, does not match the redirection URI used in the authorization request, ' +
            'or was issued to another client.',
            code: 'invalid_grant',
        });
    }
}
