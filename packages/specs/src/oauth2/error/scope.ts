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

export const OAUTH2_SCOPE_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2ScopeError');

export class OAuth2ScopeError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_SCOPE_INVALID,
            message: 'The scope is invalid.',
            ...options,
            data: {
                error: OAuth2ErrorCode.INVALID_SCOPE,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_SCOPE_ERROR_INSTANCE);
    }

    static invalid() {
        return new OAuth2ScopeError({ message: 'The requested scope is invalid, unknown or malformed.' });
    }

    static insufficient() {
        return new OAuth2ScopeError({
            code: ErrorCode.OAUTH_SCOPE_INSUFFICIENT,
            message: 'The request requires higher privileges than supported by the client.',
            data: { error: OAuth2ErrorCode.INSUFFICIENT_SCOPE },
        });
    }
}
