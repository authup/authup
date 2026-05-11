/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, hasInstanceof, isAuthupError } from '@authup/errors';
import { type JWTError, JWT_ERROR_INSTANCE } from './error.ts';

export function isJWTErrorCode(code: unknown) {
    return code === ErrorCode.JWT_EXPIRED ||
        code === ErrorCode.JWT_INVALID ||
        code === ErrorCode.JWT_INACTIVE;
}

export function isJWTError(input: unknown): input is JWTError {
    if (hasInstanceof(input, JWT_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return isJWTErrorCode(input.code);
}
