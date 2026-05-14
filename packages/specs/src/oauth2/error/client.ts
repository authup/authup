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

export const OAUTH2_CLIENT_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2ClientError');

export class OAuth2ClientError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_CLIENT_INVALID,
            message: 'Client authentication failed',
            ...options,
            data: {
                error: OAuth2ErrorCode.INVALID_CLIENT,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_CLIENT_ERROR_INSTANCE);
    }

    static invalid() {
        return new OAuth2ClientError({ message: 'Client authentication failed' });
    }

    static inactive() {
        return new OAuth2ClientError({ message: 'Client is inactive' });
    }
}
