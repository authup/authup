/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, isAuthupError, matchesInstanceof } from '@authup/errors';
import { PERMISSION_ERROR_INSTANCE, type PermissionError } from './module';

export function isPermissionError(input: unknown): input is PermissionError {
    if (matchesInstanceof(input, PERMISSION_ERROR_INSTANCE)) {
        return true;
    }

    if (!isAuthupError(input)) {
        return false;
    }

    return input.code === ErrorCode.PERMISSION_NOT_FOUND ||
        input.code === ErrorCode.PERMISSION_DENIED ||
        input.code === ErrorCode.PERMISSION_EVALUATION_FAILED;
}
