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

export const OAUTH2_SERVER_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2ServerError');

export class OAuth2ServerError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.INTERNAL_ERROR,
            message: 'An internal server error occurred.',
            ...options,
            data: {
                error: OAuth2ErrorCode.SERVER_ERROR,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_SERVER_ERROR_INSTANCE);
    }

    static signingKeyMissing() {
        return new OAuth2ServerError({ message: 'A token signing key could not be retrieved.' });
    }
}
