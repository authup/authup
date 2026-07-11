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

export const OAUTH2_CLIENT_UNAUTHORIZED_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2ClientUnauthorizedError');

export class OAuth2ClientUnauthorizedError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_CLIENT_UNAUTHORIZED,
            message: 'The client is not authorized to use this authorization grant type',
            ...options,
            data: {
                error: OAuth2ErrorCode.UNAUTHORIZED_CLIENT,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_CLIENT_UNAUTHORIZED_ERROR_INSTANCE);
    }

    static grantType(grantType: string) {
        return new OAuth2ClientUnauthorizedError({ message: `The client is not authorized to use the '${grantType}' grant type` });
    }
}
