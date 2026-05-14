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

export const OAUTH2_REQUEST_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2RequestError');

export class OAuth2RequestError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_REQUEST_INVALID,
            message: 'The request is malformed.',
            ...options,
            data: {
                error: OAuth2ErrorCode.INVALID_REQUEST,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_REQUEST_ERROR_INSTANCE);
    }

    static malformed(message?: string) {
        return new OAuth2RequestError({
            message: message || 'The request is missing a required parameter, includes an unsupported parameter value, ' +
                'repeats a parameter, or is otherwise malformed.',
            data: { hint: 'Check that all parameters have been provided correctly' },
        });
    }

    static stateInvalid() {
        return new OAuth2RequestError({ message: 'The request state is invalid, unknown or malformed.' });
    }

    static identityInvalid() {
        return new OAuth2RequestError({ message: 'The identity is not valid.' });
    }

    static codeRequestInvalid() {
        return new OAuth2RequestError({
            message: 'The authorization code request is invalid.',
            data: { hint: 'Check if the code request is valid and contains all required parameters' },
        });
    }
}
