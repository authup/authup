/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, ValidationError, markInstanceof } from '@authup/errors';

export const PASSWORD_RECOVERY_DISABLED_ERROR_INSTANCE = Symbol.for('@authup/server-core/PasswordRecoveryDisabledError');

export class PasswordRecoveryDisabledError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.PASSWORD_RECOVERY_DISABLED,
            message: 'Password recovery is not enabled.',
        });
        markInstanceof(this, PASSWORD_RECOVERY_DISABLED_ERROR_INSTANCE);
    }
}
