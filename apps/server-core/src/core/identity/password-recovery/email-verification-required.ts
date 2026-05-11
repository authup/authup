/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ErrorCode, markInstanceof } from '@authup/errors';

export const EMAIL_VERIFICATION_REQUIRED_ERROR_INSTANCE = Symbol.for('@authup/server-core/EmailVerificationRequiredError');

export class EmailVerificationRequiredError extends BadRequestError {
    constructor(message: string = 'Email verification is required.') {
        super({
            code: ErrorCode.EMAIL_VERIFICATION_REQUIRED,
            message,
        });
        markInstanceof(this, EMAIL_VERIFICATION_REQUIRED_ERROR_INSTANCE);
    }
}
