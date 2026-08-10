/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ErrorCode, 
    ValidationError, 
    isAuthupError, 
    markInstanceof, 
    matchesInstanceof,
} from '@authup/errors';

export const IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED_ERROR_INSTANCE = Symbol.for('@authup/server-core/IdentityProviderAccountUnlinkBlockedError');

export class IdentityProviderAccountUnlinkBlockedError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED,
            message: 'The last linked account of a user without a password can not be removed.',
        });
        markInstanceof(this, IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED_ERROR_INSTANCE);
    }
}

export function isIdentityProviderAccountUnlinkBlockedError(input: unknown): input is IdentityProviderAccountUnlinkBlockedError {
    if (matchesInstanceof(input, IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED;
}
