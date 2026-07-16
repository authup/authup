/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, ValidationError, markInstanceof } from '@authup/errors';

export const REGISTRATION_DISABLED_ERROR_INSTANCE = Symbol.for('@authup/server-core/RegistrationDisabledError');

export class RegistrationDisabledError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.REGISTRATION_DISABLED,
            message: 'User registration is not enabled.',
        });
        markInstanceof(this, REGISTRATION_DISABLED_ERROR_INSTANCE);
    }
}
