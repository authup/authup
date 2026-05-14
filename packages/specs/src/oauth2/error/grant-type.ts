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

export const OAUTH2_GRANT_TYPE_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2GrantTypeError');

export class OAuth2GrantTypeError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_GRANT_TYPE_UNSUPPORTED,
            message: 'The authorization grant type is not supported by the authorization server',
            ...options,
            data: {
                error: OAuth2ErrorCode.UNSUPPORTED_GRANT_TYPE,
                hint: 'Check that all required parameters have been provided',
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_GRANT_TYPE_ERROR_INSTANCE);
    }

    static unsupported() {
        return new OAuth2GrantTypeError();
    }
}
