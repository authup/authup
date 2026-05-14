/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, markInstanceof } from '@authup/errors';
import type { AuthupErrorInput } from '@authup/errors';
import { OAuth2ErrorCode } from '../constants';
import { OAuth2Error, normalizeOAuth2ErrorInput } from './module.ts';

export const OAUTH2_GRANT_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2GrantError');

export class OAuth2GrantError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_GRANT_INVALID,
            message: 'The provided authorization grant is invalid.',
            ...options,
            data: {
                error: OAuth2ErrorCode.INVALID_GRANT,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_GRANT_ERROR_INSTANCE);
    }

    static invalid(message?: string) {
        return new OAuth2GrantError({
            message: message || 'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token ' +
                'is invalid, expired, revoked, does not match the redirection URI used in the authorization request, ' +
                'or was issued to another client',
        });
    }

    static redirectUriMismatch() {
        return new OAuth2GrantError({
            code: ErrorCode.OAUTH_REDIRECT_URI_MISMATCH,
            message: 'The redirect URI is missing or do not match',
        });
    }
}
