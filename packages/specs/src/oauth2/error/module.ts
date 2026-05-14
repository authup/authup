/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AuthupError,
    ErrorCode,
    markInstanceof,
} from '@authup/errors';
import type { AuthupErrorInput, AuthupErrorOptions } from '@authup/errors';
import { OAuth2ErrorCode } from '../constants';

export const OAUTH2_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2Error');

export function normalizeOAuth2ErrorInput(input?: AuthupErrorInput): AuthupErrorOptions {
    return typeof input === 'string' ? { message: input } : (input ?? {});
}

export class OAuth2Error extends AuthupError {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_REQUEST_INVALID,
            message: 'OAuth2 request invalid',
            ...options,
            data: {
                error: OAuth2ErrorCode.INVALID_REQUEST,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_ERROR_INSTANCE);
    }
}
