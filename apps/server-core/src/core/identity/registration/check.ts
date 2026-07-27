/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, isAuthupError, matchesInstanceof } from '@authup/errors';
import { REGISTRATION_DISABLED_ERROR_INSTANCE, type RegistrationDisabledError } from './error.ts';

export function isRegistrationDisabledError(input: unknown): input is RegistrationDisabledError {
    if (matchesInstanceof(input, REGISTRATION_DISABLED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.REGISTRATION_DISABLED;
}
