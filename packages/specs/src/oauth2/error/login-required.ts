/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, markInstanceof } from '@authup/errors';
import type { AuthupErrorInput } from '@authup/errors';
import { OAuth2ErrorCode } from '../constants';
import { OAuth2Error, normalizeOAuth2ErrorInput } from './module.ts';

export const OAUTH2_LOGIN_REQUIRED_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2LoginRequiredError');

export class OAuth2LoginRequiredError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_LOGIN_REQUIRED,
            message: 'Authentication is required to continue.',
            ...options,
            data: {
                error: OAuth2ErrorCode.LOGIN_REQUIRED,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_LOGIN_REQUIRED_ERROR_INSTANCE);
    }

    static realmMismatch() {
        return new OAuth2LoginRequiredError({ message: 'Sign in with an account for the requested realm to continue.' });
    }
}
