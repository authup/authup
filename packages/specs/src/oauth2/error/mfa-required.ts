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

export const OAUTH2_MFA_REQUIRED_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2MfaRequiredError');

export class OAuth2MfaRequiredError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_MFA_REQUIRED,
            message: 'A second factor is required to continue.',
            ...options,
            data: {
                error: OAuth2ErrorCode.MFA_REQUIRED,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_MFA_REQUIRED_ERROR_INSTANCE);
    }

    static challengeRequired() {
        return new OAuth2MfaRequiredError({ message: 'Complete a second-factor challenge to continue.' });
    }

    static enrollmentRequired() {
        return new OAuth2MfaRequiredError({ message: 'Enroll a second factor to continue.' });
    }

    static stepUpRequired() {
        return new OAuth2MfaRequiredError({ message: 'A fresh second-factor challenge is required to continue.' });
    }
}
