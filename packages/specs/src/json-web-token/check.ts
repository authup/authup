/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';

export function isJWTErrorCode(code: unknown) {
    return code === ErrorCode.JWT_EXPIRED ||
        code === ErrorCode.JWT_INVALID ||
        code === ErrorCode.JWT_INACTIVE;
}
