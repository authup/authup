/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';

export function isJWKErrorCode(code: unknown) {
    return code === ErrorCode.JWK_INVALID ||
        code === ErrorCode.JWK_NOT_FOUND;
}
