/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../constants.ts';
import { markInstanceof } from '@ebec/core';
import { UnauthorizedError } from './unauthorized.ts';

export const BEARER_TOKEN_MALFORMED_ERROR_INSTANCE = Symbol.for('@authup/errors/BearerTokenMalformedError');

export class BearerTokenMalformedError extends UnauthorizedError {
    constructor(message?: string) {
        super({
            code: ErrorCode.HTTP_BEARER_TOKEN_MALFORMED,
            message: message ?? 'The Authorization header is malformed.',
        });
        markInstanceof(this, BEARER_TOKEN_MALFORMED_ERROR_INSTANCE);
    }
}
