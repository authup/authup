/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, hasInstanceof, isAuthupError } from '@authup/errors';
import { CLIENT_ERROR_INSTANCE, type ClientError } from './error';

export function isClientError(input: unknown): input is ClientError {
    if (hasInstanceof(input, CLIENT_ERROR_INSTANCE)) {
        return true;
    }
    if (!isAuthupError(input)) {
        return false;
    }

    return input.code === ErrorCode.ENTITY_CREDENTIALS_INVALID ||
        input.code === ErrorCode.OAUTH_CLIENT_INVALID ||
        input.code === ErrorCode.ENTITY_NOT_FOUND ||
        input.code === ErrorCode.ENTITY_INACTIVE;
}
