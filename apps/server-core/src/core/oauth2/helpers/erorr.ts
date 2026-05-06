/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Error, OAuth2ErrorCode } from '@authup/specs';
import { AuthupError } from '@authup/errors';
import { sanitizeError } from '../../../utils/index.ts';

/**
 * Transforms an unknown error to an OAuth2Error.
 *
 * @param err
 */
export function toOAuth2Error(err: unknown) : OAuth2Error {
    if (err instanceof OAuth2Error) {
        return err;
    }

    const source : AuthupError = err instanceof AuthupError ? err : sanitizeError(err);

    return new OAuth2Error({
        message: source.message,
        code: source.code,
        status: source.status,
        data: {
            error: OAuth2ErrorCode.INVALID_REQUEST,
            error_description: source.message,
            ...(source.data ?? {}),
        },
    });
}
