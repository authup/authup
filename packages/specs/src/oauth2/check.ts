/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, hasInstanceof, isAuthupError } from '@authup/errors';
import { isObject } from '@authup/kit';
import {
    OAUTH2_CLIENT_ERROR_INSTANCE,
    OAUTH2_CLIENT_UNAUTHORIZED_ERROR_INSTANCE,
    OAUTH2_ERROR_INSTANCE,
    OAUTH2_GRANT_ERROR_INSTANCE,
    OAUTH2_GRANT_TYPE_ERROR_INSTANCE,
    OAUTH2_REQUEST_ERROR_INSTANCE,
    OAUTH2_RESPONSE_TYPE_ERROR_INSTANCE,
    OAUTH2_SCOPE_ERROR_INSTANCE,
    OAUTH2_SERVER_ERROR_INSTANCE,
    type OAuth2ClientError,
    type OAuth2ClientUnauthorizedError,
    type OAuth2Error,
    type OAuth2GrantError,
    type OAuth2GrantTypeError,
    type OAuth2RequestError,
    type OAuth2ResponseTypeError,
    type OAuth2ScopeError,
    type OAuth2ServerError,
} from './error/index.ts';

export function isOAuth2Error(input: unknown): input is OAuth2Error {
    if (hasInstanceof(input, OAUTH2_ERROR_INSTANCE)) {
        return true;
    }

    if (!isAuthupError(input)) {
        return false;
    }

    const { data } = input;
    return isObject(data) && typeof data.error === 'string';
}

export function isOAuth2RequestError(input: unknown): input is OAuth2RequestError {
    if (hasInstanceof(input, OAUTH2_REQUEST_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_REQUEST_INVALID;
}

export function isOAuth2ClientError(input: unknown): input is OAuth2ClientError {
    if (hasInstanceof(input, OAUTH2_CLIENT_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_CLIENT_INVALID;
}

export function isOAuth2ClientUnauthorizedError(input: unknown): input is OAuth2ClientUnauthorizedError {
    if (hasInstanceof(input, OAUTH2_CLIENT_UNAUTHORIZED_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_CLIENT_UNAUTHORIZED;
}

export function isOAuth2GrantError(input: unknown): input is OAuth2GrantError {
    if (hasInstanceof(input, OAUTH2_GRANT_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_GRANT_INVALID ||
        input.code === ErrorCode.OAUTH_REDIRECT_URI_MISMATCH;
}

export function isOAuth2ScopeError(input: unknown): input is OAuth2ScopeError {
    if (hasInstanceof(input, OAUTH2_SCOPE_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_SCOPE_INVALID ||
        input.code === ErrorCode.OAUTH_SCOPE_INSUFFICIENT;
}

export function isOAuth2GrantTypeError(input: unknown): input is OAuth2GrantTypeError {
    if (hasInstanceof(input, OAUTH2_GRANT_TYPE_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED;
}

export function isOAuth2ResponseTypeError(input: unknown): input is OAuth2ResponseTypeError {
    if (hasInstanceof(input, OAUTH2_RESPONSE_TYPE_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED;
}

export function isOAuth2ServerError(input: unknown): input is OAuth2ServerError {
    if (hasInstanceof(input, OAUTH2_SERVER_ERROR_INSTANCE)) {
        return true;
    }

    if (!isOAuth2Error(input)) {
        return false;
    }

    return input.code === ErrorCode.INTERNAL_ERROR;
}
