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

export const OAUTH2_TARGET_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2TargetError');

export class OAuth2TargetError extends OAuth2Error {
    constructor(input?: AuthupErrorInput) {
        const options = normalizeOAuth2ErrorInput(input);

        super({
            code: ErrorCode.OAUTH_TARGET_INVALID,
            message: 'The requested target is not allowed for this client.',
            ...options,
            data: {
                error: OAuth2ErrorCode.INVALID_TARGET,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_TARGET_ERROR_INSTANCE);
    }

    static audience() {
        return new OAuth2TargetError({ message: 'The requested audience is not allowed for this client.' });
    }

    static capability(capability: string) {
        return new OAuth2TargetError({ message: `The capability ${capability} is not allowed for this audience.` });
    }
}
