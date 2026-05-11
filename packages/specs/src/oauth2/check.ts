/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasInstanceof, isAuthupError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { OAUTH2_ERROR_INSTANCE, type OAuth2Error } from './error.ts';

export function isOAuth2Error(input: unknown): input is OAuth2Error {
    if (hasInstanceof(input, OAUTH2_ERROR_INSTANCE)) {
        return true;
    }

    if (!isAuthupError(input)) {
        return false;
    }

    const { data } = input;
    return isObject(data) && typeof data.error === 'string';
}
