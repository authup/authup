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

export const OAUTH2_DEVICE_AUTHORIZATION_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2DeviceAuthorizationError');

export class OAuth2DeviceAuthorizationError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_AUTHORIZATION_PENDING,
            message: 'The authorization request is still pending.',
            ...options,
            data: {
                error: OAuth2ErrorCode.AUTHORIZATION_PENDING,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_DEVICE_AUTHORIZATION_ERROR_INSTANCE);
    }

    static pending() {
        return new OAuth2DeviceAuthorizationError();
    }

    static slowDown() {
        return new OAuth2DeviceAuthorizationError({
            code: ErrorCode.OAUTH_SLOW_DOWN,
            message: 'Polling too frequently. Increase the interval by 5 seconds.',
            data: { error: OAuth2ErrorCode.SLOW_DOWN },
        });
    }

    static expired() {
        return new OAuth2DeviceAuthorizationError({
            code: ErrorCode.OAUTH_DEVICE_CODE_EXPIRED,
            message: 'The device code has expired.',
            data: { error: OAuth2ErrorCode.EXPIRED_TOKEN },
        });
    }
}
