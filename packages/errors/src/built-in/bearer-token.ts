/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UnauthorizedError } from '@ebec/http';
import { ErrorCode } from '../constants';

export class BearerTokenMalformedError extends UnauthorizedError {
    constructor(message?: string) {
        super({
            code: ErrorCode.HTTP_BEARER_TOKEN_MALFORMED,
            message: message ?? 'The Authorization header is malformed.',
        });
    }
}
