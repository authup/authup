/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, ValidationError, markInstanceof } from '@authup/errors';

export const RESET_TOKEN_EXPIRED_ERROR_INSTANCE = Symbol.for('@authup/server-core/ResetTokenExpiredError');

export class ResetTokenExpiredError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.RESET_TOKEN_EXPIRED,
            message: 'Reset token has expired.',
        });
        markInstanceof(this, RESET_TOKEN_EXPIRED_ERROR_INSTANCE);
    }
}
