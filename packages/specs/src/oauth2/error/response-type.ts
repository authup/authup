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

export const OAUTH2_RESPONSE_TYPE_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2ResponseTypeError');

export class OAuth2ResponseTypeError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_RESPONSE_TYPE_UNSUPPORTED,
            message: 'The authorization server does not support obtaining an access token using this method.',
            ...options,
            data: {
                error: OAuth2ErrorCode.UNSUPPORTED_RESPONSE_TYPE,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_RESPONSE_TYPE_ERROR_INSTANCE);
    }

    static unsupported() {
        return new OAuth2ResponseTypeError();
    }
}
