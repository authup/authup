/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Error, OAuth2ErrorCode } from '@authup/specs';
import { AuthupError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { sanitizeError } from '../../../utils/index.ts';

/**
 * Transforms an unknown error to an OAuth2Error.
 *
 * @param err
 */
export function toOAuth2Error(err: unknown) : AuthupError | OAuth2Error {
    if (err instanceof OAuth2Error) {
        return err;
    }

    let next : AuthupError;
    if (err instanceof AuthupError) {
        next = err;
    } else {
        next = sanitizeError(err);
    }

    next.data = {
        error: OAuth2ErrorCode.INVALID_REQUEST,
        error_description: next.message,
        ...(isObject(next.data) ? next.data : {}),
    };

    return next;
}
