/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, isAuthupError, matchesInstanceof } from '@authup/errors';
import { type JWKError, JWK_ERROR_INSTANCE } from './error.ts';

export function isJWKErrorCode(code: unknown) {
    return code === ErrorCode.JWK_INVALID ||
        code === ErrorCode.JWK_NOT_FOUND;
}

export function isJWKError(input: unknown): input is JWKError {
    if (matchesInstanceof(input, JWK_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return isJWKErrorCode(input.code);
}
