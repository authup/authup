/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, isAuthupError, matchesInstanceof } from '@authup/errors';
import { PASSWORD_RECOVERY_DISABLED_ERROR_INSTANCE, type PasswordRecoveryDisabledError } from './disabled.ts';
import { EMAIL_VERIFICATION_REQUIRED_ERROR_INSTANCE, type EmailVerificationRequiredError } from './email-verification-required.ts';
import { RESET_TOKEN_EXPIRED_ERROR_INSTANCE, type ResetTokenExpiredError } from './token-expired.ts';

export function isPasswordRecoveryDisabledError(input: unknown): input is PasswordRecoveryDisabledError {
    if (matchesInstanceof(input, PASSWORD_RECOVERY_DISABLED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.PASSWORD_RECOVERY_DISABLED;
}

export function isEmailVerificationRequiredError(input: unknown): input is EmailVerificationRequiredError {
    if (matchesInstanceof(input, EMAIL_VERIFICATION_REQUIRED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.EMAIL_VERIFICATION_REQUIRED;
}

export function isResetTokenExpiredError(input: unknown): input is ResetTokenExpiredError {
    if (matchesInstanceof(input, RESET_TOKEN_EXPIRED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.RESET_TOKEN_EXPIRED;
}
